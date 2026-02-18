import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STAFF_ROSTER_PATH = "Previous Documents/VRHub/Staff Roster";
const RADIOLOGIST_ROSTER_PATH = "Previous Documents/VRHub/Radiologist Roster";

interface SharePointFile {
  id: string;
  name: string;
  webUrl: string;
  lastModifiedDateTime: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get an active O365 connection with SharePoint config
    const { data: connections, error: connError } = await supabase
      .from("office365_connections")
      .select("id, company_id, access_token, refresh_token, expires_at")
      .not("company_id", "is", null)
      .order("updated_at", { ascending: false })
      .limit(1);

    if (connError || !connections || connections.length === 0) {
      console.error("No Office 365 connections found");
      return new Response(
        JSON.stringify({ error: "No Office 365 connection available", success: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const connection = connections[0];
    const companyId = connection.company_id;

    // Get SharePoint configuration for this company
    const { data: configs } = await supabase
      .from("sharepoint_configurations")
      .select("site_id, site_url")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .limit(1);

    if (!configs || configs.length === 0) {
      console.error("No SharePoint configuration found");
      return new Response(
        JSON.stringify({ error: "No SharePoint configuration", success: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const config = configs[0];

    // Check if token needs refresh
    let accessToken = connection.access_token;
    const expiresAt = connection.expires_at ? new Date(connection.expires_at) : null;
    const refreshThreshold = new Date(Date.now() + 5 * 60 * 1000);

    if (!accessToken || !expiresAt || expiresAt <= refreshThreshold) {
      if (!connection.refresh_token) {
        return new Response(
          JSON.stringify({ error: "Office 365 token expired and no refresh token", success: false }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const clientId = Deno.env.get("MICROSOFT_GRAPH_CLIENT_ID");
      const clientSecret = Deno.env.get("MICROSOFT_GRAPH_CLIENT_SECRET");

      console.log("Refreshing Office 365 token...");

      const tokenResponse = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId!,
          client_secret: clientSecret!,
          refresh_token: connection.refresh_token,
          grant_type: "refresh_token",
        }),
      });

      if (!tokenResponse.ok) {
        console.error("Token refresh failed:", await tokenResponse.text());
        return new Response(
          JSON.stringify({ error: "Failed to refresh Office 365 token", success: false }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const tokens = await tokenResponse.json();
      accessToken = tokens.access_token;

      await supabase
        .from("office365_connections")
        .update({
          access_token: tokens.access_token,
          expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
          updated_at: new Date().toISOString(),
          ...(tokens.refresh_token && { refresh_token: tokens.refresh_token }),
        })
        .eq("id", connection.id);

      console.log("Token refreshed successfully");
    }

    // Helper to fetch latest file from a path
    async function getLatestFile(folderPath: string): Promise<SharePointFile | null> {
      try {
        const cleanPath = folderPath.replace(/^\/+/, "").replace(/\/+$/, "");
        const graphUrl = `https://graph.microsoft.com/v1.0/sites/${config.site_id}/drive/root:/${cleanPath}:/children`;

        console.log(`Fetching: ${graphUrl}`);

        const response = await fetch(graphUrl, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          console.error(`Graph API error for ${folderPath}:`, response.status, await response.text());
          return null;
        }

        const data = await response.json();
        const files = (data.value || []).filter((item: any) => item.file);

        if (files.length === 0) {
          console.log(`No files found in ${folderPath}`);
          return null;
        }

        // Sort by lastModifiedDateTime descending
        files.sort((a: any, b: any) =>
          new Date(b.lastModifiedDateTime).getTime() - new Date(a.lastModifiedDateTime).getTime()
        );

        const latest = files[0];
        console.log(`Latest file in ${folderPath}: ${latest.name}`);

        return {
          id: latest.id,
          name: latest.name,
          webUrl: latest.webUrl,
          lastModifiedDateTime: latest.lastModifiedDateTime,
        };
      } catch (error) {
        console.error(`Error fetching ${folderPath}:`, error);
        return null;
      }
    }

    // Fetch both rosters in parallel
    const [staffRoster, radiologistRoster] = await Promise.all([
      getLatestFile(STAFF_ROSTER_PATH),
      getLatestFile(RADIOLOGIST_ROSTER_PATH),
    ]);

    // Update the cache
    const now = new Date().toISOString();

    const cacheUpdates: Array<{
      roster_type: "staff" | "radiologist";
      file_name: string;
      web_url: string;
      cached_at: string;
      updated_at: string;
    }> = [];

    if (staffRoster) {
      cacheUpdates.push({
        roster_type: "staff",
        file_name: staffRoster.name,
        web_url: staffRoster.webUrl,
        cached_at: now,
        updated_at: now,
      });
    }

    if (radiologistRoster) {
      cacheUpdates.push({
        roster_type: "radiologist",
        file_name: radiologistRoster.name,
        web_url: radiologistRoster.webUrl,
        cached_at: now,
        updated_at: now,
      });
    }

    if (cacheUpdates.length > 0) {
      const { error: upsertError } = await supabase
        .from("roster_cache" as any)
        .upsert(cacheUpdates, { onConflict: "roster_type" });

      if (upsertError) {
        console.error("Failed to upsert roster_cache:", upsertError);
        return new Response(
          JSON.stringify({ error: "Failed to update roster cache", success: false }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    console.log("Roster cache updated successfully");

    return new Response(
      JSON.stringify({
        success: true,
        staffRoster: staffRoster ? { name: staffRoster.name, webUrl: staffRoster.webUrl } : null,
        radiologistRoster: radiologistRoster ? { name: radiologistRoster.name, webUrl: radiologistRoster.webUrl } : null,
        cachedAt: now,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error syncing roster cache:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage, success: false }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
