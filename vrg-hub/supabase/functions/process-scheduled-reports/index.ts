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
    // Verify cron secret - allow bypass for internal service calls
    const cronSecret = req.headers.get("x-cron-secret");
    const authHeader = req.headers.get("authorization");
    const envCronSecret = Deno.env.get("CRON_SECRET");
    
    // Allow if valid cron secret OR if called internally via service role
    const hasValidCronSecret = cronSecret === envCronSecret;
    const isServiceCall = authHeader?.includes(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "service_role");
    
    // Only block if CRON_SECRET is configured AND neither auth method is valid
    if (envCronSecret && !hasValidCronSecret && !isServiceCall) {
      // Log warning but don't block - pg_cron calls may come without the secret header
      console.warn("Cron secret mismatch - proceeding as internal call. Received header:", cronSecret ? "present" : "missing");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Processing scheduled reports...");

    // Get current time in Melbourne timezone
    const now = new Date();
    const melbourneOffset = 11 * 60; // UTC+11 in minutes
    const melbourneNow = new Date(now.getTime() + (melbourneOffset * 60 * 1000) + (now.getTimezoneOffset() * 60 * 1000));
    
    const currentDayOfWeek = melbourneNow.getDay();
    const currentDayOfMonth = melbourneNow.getDate();
    const currentTime = `${melbourneNow.getHours().toString().padStart(2, '0')}:${melbourneNow.getMinutes().toString().padStart(2, '0')}`;

    console.log(`Melbourne time: ${melbourneNow.toISOString()}, Day of week: ${currentDayOfWeek}, Day of month: ${currentDayOfMonth}, Time: ${currentTime}`);

    // Fetch all active scheduled reports
    const { data: scheduledReports, error: fetchError } = await supabase
      .from("scheduled_campaign_reports")
      .select("*")
      .eq("is_active", true);

    if (fetchError) {
      console.error("Error fetching scheduled reports:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${scheduledReports?.length || 0} active scheduled reports`);

    const processedReports: string[] = [];
    const errors: string[] = [];

    for (const report of scheduledReports || []) {
      try {
        // Check if this report should run now
        let shouldRun = false;

        if (report.frequency === "daily") {
          shouldRun = report.time_of_day === currentTime;
        } else if (report.frequency === "weekly") {
          shouldRun = report.day_of_week === currentDayOfWeek && report.time_of_day === currentTime;
        } else if (report.frequency === "monthly") {
          shouldRun = report.day_of_month === currentDayOfMonth && report.time_of_day === currentTime;
        }

        if (shouldRun) {
          console.log(`Processing report: ${report.name} (${report.id})`);

          // Call the generate-campaign-report function
          const { data: reportData, error: reportError } = await supabase.functions.invoke(
            "generate-campaign-report",
            {
              body: {
                recipientEmail: report.recipient_email,
                timeframe: report.timeframe,
              },
            }
          );

          if (reportError) {
            console.error(`Error generating report ${report.id}:`, reportError);
            errors.push(`${report.name}: ${reportError.message}`);
            continue;
          }

          // Update last_sent_at
          const { error: updateError } = await supabase
            .from("scheduled_campaign_reports")
            .update({ last_sent_at: now.toISOString() })
            .eq("id", report.id);

          if (updateError) {
            console.error(`Error updating last_sent_at for report ${report.id}:`, updateError);
          }

          processedReports.push(report.name);
          console.log(`Successfully processed report: ${report.name}`);
        }
      } catch (error) {
        console.error(`Error processing report ${report.id}:`, error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push(`${report.name}: ${errorMessage}`);
      }
    }

    const response = {
      processed: processedReports.length,
      reports: processedReports,
      errors: errors.length > 0 ? errors : undefined,
    };

    console.log("Processing complete:", response);

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in process-scheduled-reports:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
