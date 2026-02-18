import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  checklistId: string;
  itemId?: string;
  action: string;
  userId?: string;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const mailgunApiKey = Deno.env.get("MAILGUN_API_KEY");
    const mailgunDomain = Deno.env.get("MAILGUN_DOMAIN");
    
    if (!mailgunApiKey || !mailgunDomain) {
      console.log("Mailgun not configured, skipping email notification");
      return new Response(JSON.stringify({ success: true, message: "Email notifications not configured" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { checklistId, itemId, action, userId }: NotificationRequest = await req.json();

    // Get checklist details
    const { data: checklist, error: checklistError } = await supabase
      .from("clinic_setup_checklists")
      .select("clinic_name")
      .eq("id", checklistId)
      .single();

    if (checklistError || !checklist) {
      console.error("Failed to fetch checklist:", checklistError);
      return new Response(JSON.stringify({ error: "Checklist not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get item details if provided
    let itemName = "";
    if (itemId) {
      const { data: item } = await supabase
        .from("clinic_setup_items")
        .select("field_name, field_value")
        .eq("id", itemId)
        .single();
      
      if (item) {
        itemName = item.field_name;
      }
    }

    // Get user who made the change
    let userName = "Someone";
    if (userId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", userId)
        .single();
      
      if (profile) {
        userName = profile.full_name || profile.email || "Someone";
      }
    }

    // Get all users with permissions for this checklist
    const { data: permissions, error: permissionsError } = await supabase
      .from("clinic_setup_permissions")
      .select("user_id")
      .eq("checklist_id", checklistId);

    if (permissionsError) {
      console.error("Failed to fetch permissions:", permissionsError);
      return new Response(JSON.stringify({ error: "Failed to fetch permissions" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get emails for all permitted users (excluding the one who made the change)
    const userIds = permissions
      .map(p => p.user_id)
      .filter(id => id !== userId);

    if (userIds.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No users to notify" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("email, full_name")
      .in("id", userIds);

    if (profilesError || !profiles || profiles.length === 0) {
      console.log("No profiles found to notify");
      return new Response(JSON.stringify({ success: true, message: "No users to notify" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const emails = profiles.filter(p => p.email).map(p => p.email!);

    if (emails.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No email addresses found" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Send notification email via Mailgun
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a1a;">Clinic Setup Checklist Updated</h2>
        <p style="color: #4a4a4a; font-size: 16px;">
          <strong>${userName}</strong> has updated the clinic setup checklist for <strong>${checklist.clinic_name}</strong>.
        </p>
        ${itemName ? `
          <div style="background-color: #f5f5f5; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #666;">Updated item:</p>
            <p style="margin: 8px 0 0 0; font-weight: bold; color: #1a1a1a;">${itemName}</p>
          </div>
        ` : ''}
        <p style="color: #4a4a4a; font-size: 14px;">
          Log in to the VRG Intranet to view the full checklist and latest updates.
        </p>
        <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
        <p style="color: #888; font-size: 12px;">
          You received this email because you have access to this clinic setup checklist.
        </p>
      </div>
    `;

    const formData = new FormData();
    formData.append("from", `VRG Intranet <notifications@${mailgunDomain}>`);
    formData.append("to", emails.join(", "));
    formData.append("subject", `Clinic Setup Update: ${checklist.clinic_name}`);
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
      console.error("Mailgun error:", mailgunResponse.status, errorText);
      throw new Error(`Failed to send email: ${errorText}`);
    }

    const emailResult = await mailgunResponse.json();
    console.log("Email notification sent:", emailResult);

    return new Response(JSON.stringify({ success: true, emailResult }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    console.error("Error in clinic-setup-notification:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
