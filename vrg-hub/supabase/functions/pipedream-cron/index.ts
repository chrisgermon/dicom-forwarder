import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify cron secret for external calls (Pipedream)
    const cronSecret = req.headers.get("x-cron-secret");
    const authHeader = req.headers.get("authorization");
    const expectedSecret = Deno.env.get("CRON_SECRET");

    // Allow either cron secret OR valid Supabase auth (for testing from UI)
    const hasCronAuth = cronSecret === expectedSecret;
    const hasSupabaseAuth = authHeader?.startsWith("Bearer ");

    if (!hasCronAuth && !hasSupabaseAuth) {
      console.error("Unauthorized: No valid authentication provided");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action } = await req.json();

    if (!action) {
      return new Response(
        JSON.stringify({ error: "Missing 'action' in request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Pipedream cron triggered: ${action}`);

    let result: any;

    switch (action) {
      case "newsletter-reminders": {
        // Trigger newsletter reminder cron
        const { data, error } = await supabase.functions.invoke("newsletter-cron-reminders", {
          body: { triggered_by: "pipedream" }
        });
        if (error) throw error;
        result = { success: true, message: "Newsletter reminders processed", data };
        break;
      }

      case "process-scheduled-reports": {
        // Trigger scheduled campaign reports
        const { data, error } = await supabase.functions.invoke("process-scheduled-reports", {
          headers: { "x-cron-secret": expectedSecret || "" }
        });
        if (error) throw error;
        result = { success: true, message: "Scheduled reports processed", data };
        break;
      }

      case "sync-campaigns": {
        // Trigger campaign sync (Mailchimp, Notifyre, BigQuery)
        const { data, error } = await supabase.functions.invoke("sync-campaigns-scheduled", {
          headers: { "x-cron-secret": expectedSecret || "" }
        });
        if (error) throw error;
        result = { success: true, message: "Campaigns synced", data };
        break;
      }

      case "office365-sync": {
        // Trigger Office 365 sync
        const { data, error } = await supabase.functions.invoke("office365-cron-sync", {
          body: { triggered_by: "pipedream" }
        });
        if (error) throw error;
        result = { success: true, message: "Office 365 sync completed", data };
        break;
      }

      case "check-reminders": {
        // Trigger reminder checks
        const { data, error } = await supabase.functions.invoke("check-reminders", {
          body: { triggered_by: "pipedream" }
        });
        if (error) throw error;
        result = { success: true, message: "Reminders checked", data };
        break;
      }

      case "sync-referrers": {
        // Trigger referrer directory sync from BigQuery
        const { data, error } = await supabase.functions.invoke("sync-referrers", {
          body: { triggered_by: "pipedream", syncType: "full" }
        });
        if (error) throw error;
        result = { success: true, message: "Referrer directory synced", data };
        break;
      }

      case "test": {
        result = { 
          success: true, 
          message: "Pipedream webhook is working", 
          timestamp: new Date().toISOString() 
        };
        break;
      }

      default:
        return new Response(
          JSON.stringify({ 
            error: `Unknown action: ${action}`,
          available_actions: [
              "newsletter-reminders",
              "process-scheduled-reports", 
              "sync-campaigns",
              "office365-sync",
              "check-reminders",
              "sync-referrers",
              "test"
            ]
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    // Log the cron execution
    await supabase.from("audit_logs").insert({
      action: `pipedream_cron_${action}`,
      table_name: "cron_jobs",
      new_data: {
        action,
        result,
        triggered_at: new Date().toISOString(),
        source: hasCronAuth ? "pipedream" : "ui_test"
      }
    });

    console.log(`Pipedream cron completed: ${action}`, result);

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Pipedream cron error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
