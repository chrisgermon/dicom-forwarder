import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  userId: string;
  email: string;
  startDate: string;
  endDate: string;
  userName: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const mailgunApiKey = Deno.env.get("MAILGUN_API_KEY");
    const mailgunDomain = Deno.env.get("MAILGUN_DOMAIN");

    if (!mailgunApiKey || !mailgunDomain) {
      throw new Error("Mailgun configuration missing");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { userId, email, startDate, endDate, userName }: EmailRequest = await req.json();

    // Fetch CPD records
    const { data: records, error: fetchError } = await supabase
      .from("cpd_attendance")
      .select(`
        *,
        category:cpd_categories(name),
        meeting:cpd_meetings(name)
      `)
      .eq("user_id", userId)
      .gte("attendance_date", startDate)
      .lte("attendance_date", endDate)
      .order("attendance_date", { ascending: true });

    if (fetchError) throw fetchError;

    // Calculate totals
    const totalCpdHours = (records || []).reduce((sum, r) => sum + r.cpd_hours_claimed, 0);

    // Format date for display
    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });
    };

    // Build HTML table for email
    const tableRows = (records || []).map((record) => `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;">${formatDate(record.attendance_date)}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${record.is_custom ? record.custom_meeting_name : record.meeting?.name || "-"}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${record.category?.name || "-"}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${record.organisation || "-"}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${record.duration_hours}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${record.cpd_hours_claimed}</td>
      </tr>
    `).join("");

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>CPD Attendance Logbook</title>
      </head>
      <body style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #2980b9; margin-bottom: 5px;">CPD Attendance Logbook</h1>
          <p style="color: #666; margin: 5px 0;">${userName}</p>
          <p style="color: #666; margin: 5px 0;">Period: ${formatDate(startDate)} - ${formatDate(endDate)}</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #2980b9; color: white;">
              <th style="padding: 10px; border: 1px solid #ddd;">Date</th>
              <th style="padding: 10px; border: 1px solid #ddd;">Activity</th>
              <th style="padding: 10px; border: 1px solid #ddd;">Category</th>
              <th style="padding: 10px; border: 1px solid #ddd;">Organisation</th>
              <th style="padding: 10px; border: 1px solid #ddd;">Duration</th>
              <th style="padding: 10px; border: 1px solid #ddd;">CPD Hrs</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows || '<tr><td colspan="6" style="padding: 20px; text-align: center;">No records found for this period.</td></tr>'}
          </tbody>
          <tfoot>
            <tr style="background-color: #f0f0f0; font-weight: bold;">
              <td colspan="5" style="padding: 10px; border: 1px solid #ddd; text-align: right;">Total CPD Hours:</td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${totalCpdHours.toFixed(1)}</td>
            </tr>
          </tfoot>
        </table>

        <p style="color: #888; font-size: 12px; text-align: center;">
          Generated on ${new Date().toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
        </p>
      </body>
      </html>
    `;

    // Send email via Mailgun
    const formData = new FormData();
    formData.append("from", `CPD Tracker <noreply@${mailgunDomain}>`);
    formData.append("to", email);
    formData.append("subject", `CPD Logbook - ${userName} (${formatDate(startDate)} to ${formatDate(endDate)})`);
    formData.append("html", emailHtml);

    const mailgunResponse = await fetch(
      `https://api.mailgun.net/v3/${mailgunDomain}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`api:${mailgunApiKey}`)}`,
        },
        body: formData,
      }
    );

    if (!mailgunResponse.ok) {
      const errorText = await mailgunResponse.text();
      console.error("Mailgun error:", errorText);
      throw new Error(`Failed to send email: ${errorText}`);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Email sent successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-cpd-report:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
