// Lookup company by email domain (public function for pre-auth login flow)
// Uses service role to safely check active domain + company and returns minimal data

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { domain } = await req.json().catch(() => ({ domain: "" }));

    // Basic validation: domain like example.com.au
    const domainStr = String(domain || "").trim().toLowerCase();
    const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;
    if (!domainStr || domainStr.length > 255 || !domainRegex.test(domainStr)) {
      return new Response(
        JSON.stringify({ error: "Invalid domain" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      return new Response(
        JSON.stringify({ error: "Server misconfiguration" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabase
      .from("company_domains")
      .select("id, domain, is_active, is_verified, verified_at")
      .eq("domain", domainStr)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      console.error("[lookup-domain] query error", error);
      return new Response(
        JSON.stringify({ error: "Lookup failed" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!data) {
      return new Response(
        JSON.stringify({ error: "Not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Optional: fetch company name from app_config for display purposes
    const { data: appConfig } = await supabase
      .from("app_config")
      .select("company_name")
      .limit(1)
      .maybeSingle();

    const company = {
      name: appConfig?.company_name ?? null,
      subdomain: null,
    };

    return new Response(
      JSON.stringify({ company }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (e) {
    console.error("[lookup-domain] unexpected error", e);
    return new Response(
      JSON.stringify({ error: "Unexpected error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
