import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { parsedText } = await req.json();
    
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Get existing brands and locations
    const { data: brands } = await supabaseClient
      .from("brands")
      .select("id, name, display_name")
      .eq("is_active", true);

    const { data: locations } = await supabaseClient
      .from("locations")
      .select("id, name, brand_id")
      .eq("is_active", true);

    // Use AI to intelligently parse the document and match to brands/locations
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const prompt = `You are parsing a DICOM modality configuration document. Your task is to extract all sites/clinics with their modalities and servers, and match each site to the correct brand and location from the provided lists.

Available Brands:
${brands?.map(b => `- ${b.display_name} (id: ${b.id})`).join('\n')}

Available Locations:
${locations?.map(l => `- ${l.name} (brand_id: ${l.brand_id}, id: ${l.id})`).join('\n')}

Document content:
${parsedText}

IMPORTANT: Use intelligent fuzzy matching for location names. Even if the Excel sheet name doesn't match exactly, find the most likely matching location from the available locations list.

Examples of fuzzy matching you should perform:
- "Hampton" in Excel should match "Hampton East" in locations
- "Warilla" should match "Warilla" (exact match)
- "Woonona - Focus" should match "Woonona" location under Focus Radiology brand
- "Sebastopol" should match "Sebastopol" location
- "Botanic Ridge" should match "Botanic Ridge" location
- "Torquay" should match "Torquay" location
- "Logan" should match "Loganholme" location
- "Rochedale" should match "Rochedale" location

For brand matching:
- Sites ending with "- Focus" belong to Focus Radiology brand
- Sites ending with "- Light" belong to Light Radiology brand
- Sites without suffix or with "- Vision" belong to Vision Radiology brand

For each site, you MUST match it to an existing location_id from the available locations. Use your best judgment to find the closest match even if names aren't identical.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are a DICOM configuration parser. Extract and structure modality data intelligently."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "parse_dicom_config",
              description: "Parse DICOM configuration and match to brands/locations",
              parameters: {
                type: "object",
                properties: {
                  sites: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        location_name: { type: "string" },
                        brand_id: { type: "string" },
                        location_id: { type: "string" },
                        ip_range: { type: "string" },
                        gateway: { type: "string" },
                        servers: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              name: { type: "string" },
                              ip_address: { type: "string" },
                              ae_title: { type: "string" },
                              port: { type: "number" },
                              function: { type: "string" }
                            },
                            required: ["name", "ip_address"]
                          }
                        },
                        modalities: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              name: { type: "string" },
                              ip_address: { type: "string" },
                              ae_title: { type: "string" },
                              port: { type: "number" },
                              worklist_ip_address: { type: "string" },
                              worklist_ae_title: { type: "string" },
                              worklist_port: { type: "number" },
                              modality_type: { type: "string" }
                            },
                            required: ["name", "ip_address"]
                          }
                        }
                      },
                      required: ["location_name", "brand_id", "location_id"]
                    }
                  }
                },
                required: ["sites"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "parse_dicom_config" } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiResult = await aiResponse.json();
    const toolCall = aiResult.choices[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error("No tool call in AI response");
    }

    const parsedData = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(parsedData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});