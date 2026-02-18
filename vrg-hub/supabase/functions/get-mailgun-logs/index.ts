import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const MAILGUN_API_KEY = Deno.env.get("MAILGUN_API_KEY");
    const MAILGUN_DOMAIN = "visionradiology.com.au";

    if (!MAILGUN_API_KEY) {
      throw new Error("Mailgun API key not configured");
    }

    const url = new URL(req.url);
    const limit = url.searchParams.get("limit") || "100";
    const begin = url.searchParams.get("begin") || "";
    const end = url.searchParams.get("end") || "";
    const event = url.searchParams.get("event") || "";

    // Build Mailgun API URL for events
    let mailgunUrl = `https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/events?limit=${limit}`;
    
    if (begin) mailgunUrl += `&begin=${encodeURIComponent(begin)}`;
    if (end) mailgunUrl += `&end=${encodeURIComponent(end)}`;
    if (event) mailgunUrl += `&event=${encodeURIComponent(event)}`;

    console.log("Fetching Mailgun logs from:", mailgunUrl);

    const response = await fetch(mailgunUrl, {
      headers: {
        Authorization: `Basic ${btoa(`api:${MAILGUN_API_KEY}`)}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Mailgun API error:", response.status, errorText);
      throw new Error(`Mailgun API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // Transform the data for easier consumption
    const events = (data.items || []).map((item: any) => ({
      id: item.id,
      timestamp: item.timestamp,
      event: item.event,
      recipient: item.recipient,
      subject: item.message?.headers?.subject || "",
      messageId: item.message?.headers?.["message-id"] || "",
      from: item.message?.headers?.from || item.envelope?.sender || "",
      deliveryStatus: item["delivery-status"] || null,
      severity: item.severity || null,
      reason: item.reason || null,
      tags: item.tags || [],
      userVariables: item["user-variables"] || {},
      geolocation: item.geolocation || null,
      ip: item.ip || null,
      clientInfo: item["client-info"] || null,
      campaigns: item.campaigns || [],
      flags: item.flags || {},
    }));

    return new Response(
      JSON.stringify({
        success: true,
        events,
        paging: data.paging || null,
        totalCount: events.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error fetching Mailgun logs:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
