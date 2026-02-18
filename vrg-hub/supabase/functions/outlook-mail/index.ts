import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function refreshTokenIfNeeded(
  supabaseAdmin: any,
  connection: any
): Promise<string> {
  const expiresAt = new Date(connection.expires_at);
  const now = new Date();
  
  if (expiresAt.getTime() - now.getTime() > 5 * 60 * 1000) {
    return connection.access_token;
  }

  console.log('Token expired or expiring soon, refreshing...');
  
  const clientId = Deno.env.get('MICROSOFT_GRAPH_CLIENT_ID');
  const clientSecret = Deno.env.get('MICROSOFT_GRAPH_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    throw new Error('Microsoft Graph credentials not configured');
  }

  const tokenResponse = await fetch(
    'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: connection.refresh_token,
        grant_type: 'refresh_token',
      }),
    }
  );

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    console.error('Token refresh failed:', errorText);
    throw new Error('Failed to refresh access token');
  }

  const tokens = await tokenResponse.json();
  const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  await supabaseAdmin
    .from('office365_connections')
    .update({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || connection.refresh_token,
      expires_at: newExpiresAt.toISOString(),
    })
    .eq('user_id', connection.user_id);

  return tokens.access_token;
}

async function fetchGraph(accessToken: string, endpoint: string) {
  const url = endpoint.startsWith('http') 
    ? endpoint 
    : `https://graph.microsoft.com/v1.0/${endpoint}`;
  
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('Graph error:', text);
    throw new Error(`Graph request failed: ${res.status}`);
  }

  return await res.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!
    ).auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: connection, error: connError } = await supabaseAdmin
      .from("office365_connections")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (connError || !connection) {
      return new Response(
        JSON.stringify({ error: "No Office 365 connection found", needsConnection: true }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const accessToken = await refreshTokenIfNeeded(supabaseAdmin, connection);
    const { action, folderId, messageId, top, skip, search } = await req.json();

    let result;

    switch (action) {
      case "getFolders": {
        const data = await fetchGraph(accessToken, "me/mailFolders?$top=50");
        result = { folders: data.value };
        break;
      }

      case "getMessages": {
        const folder = folderId || "inbox";
        const limit = top || 25;
        const offset = skip || 0;
        let endpoint = `me/mailFolders/${folder}/messages?$top=${limit}&$skip=${offset}&$orderby=receivedDateTime desc&$select=id,subject,bodyPreview,from,toRecipients,receivedDateTime,isRead,hasAttachments,importance,flag,webLink`;
        
        if (search) {
          endpoint += `&$search="${encodeURIComponent(search)}"`;
        }
        
        const data = await fetchGraph(accessToken, endpoint);
        result = { 
          messages: data.value,
          nextLink: data["@odata.nextLink"] || null,
          count: data["@odata.count"] || data.value.length
        };
        break;
      }

      case "getMessage": {
        if (!messageId) {
          throw new Error("messageId is required");
        }
        const data = await fetchGraph(
          accessToken,
          `me/messages/${messageId}?$select=id,subject,body,bodyPreview,from,toRecipients,ccRecipients,receivedDateTime,sentDateTime,isRead,hasAttachments,importance,flag,webLink,attachments`
        );
        result = { message: data };
        break;
      }

      case "markAsRead": {
        if (!messageId) {
          throw new Error("messageId is required");
        }
        await fetch(`https://graph.microsoft.com/v1.0/me/messages/${messageId}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ isRead: true }),
        });
        result = { success: true };
        break;
      }

      case "getUnreadCount": {
        const data = await fetchGraph(accessToken, "me/mailFolders/inbox?$select=unreadItemCount,totalItemCount");
        result = { 
          unreadCount: data.unreadItemCount,
          totalCount: data.totalItemCount
        };
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error in outlook-mail:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
