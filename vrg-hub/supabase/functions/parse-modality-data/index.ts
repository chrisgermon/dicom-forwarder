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
    const { data, type } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are a data extraction assistant specializing in DICOM modality configurations. 
Extract network configuration, DICOM servers, and modalities from the provided data.
Try to identify the brand and location from context clues (clinic name, address, facility name, etc.).

Return the data in this exact JSON structure:
{
  "clinic_config": {
    "location_name": "string",
    "ip_range": "string or null",
    "gateway": "string or null"
  },
  "detected_brand": "string or null (brand name if identifiable from context)",
  "detected_location": "string or null (location/facility name if identifiable)",
  "servers": [
    {
      "name": "string",
      "ip_address": "string",
      "ae_title": "string or null",
      "port": "number or null",
      "function": "string or null"
    }
  ],
  "modalities": [
    {
      "name": "string",
      "ip_address": "string",
      "ae_title": "string or null",
      "port": "number or null",
      "worklist_ip_address": "string or null",
      "worklist_ae_title": "string or null",
      "worklist_port": "number or null",
      "modality_type": "string or null (CT, MR, XA, US, CR, DX, MG, NM, PT)"
    }
  ]
}

Extract all available information. If a field is not present, use null.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Extract DICOM modality data from this ${type}:\n\n${data}` }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_modality_data",
              description: "Extract clinic network configuration, DICOM servers, and modalities",
              parameters: {
                type: "object",
                properties: {
                  clinic_config: {
                    type: "object",
                    properties: {
                      location_name: { type: "string" },
                      ip_range: { type: ["string", "null"] },
                      gateway: { type: ["string", "null"] }
                    },
                    required: ["location_name"]
                  },
                  detected_brand: { type: ["string", "null"], description: "Brand name if identifiable from context" },
                  detected_location: { type: ["string", "null"], description: "Location/facility name if identifiable" },
                  servers: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        ip_address: { type: "string" },
                        ae_title: { type: ["string", "null"] },
                        port: { type: ["number", "null"] },
                        function: { type: ["string", "null"] }
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
                        ae_title: { type: ["string", "null"] },
                        port: { type: ["number", "null"] },
                        worklist_ip_address: { type: ["string", "null"] },
                        worklist_ae_title: { type: ["string", "null"] },
                        worklist_port: { type: ["number", "null"] },
                        modality_type: { type: ["string", "null"], description: "CT, MR, XA, US, CR, DX, MG, NM, PT" }
                      },
                      required: ["name", "ip_address"]
                    }
                  }
                },
                required: ["clinic_config", "servers", "modalities"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_modality_data" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const result = await response.json();
    console.log("AI response:", JSON.stringify(result, null, 2));
    
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("No tool call in AI response");
    }

    const parsedData = JSON.parse(toolCall.function.arguments);
    
    return new Response(JSON.stringify(parsedData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Error in parse-modality-data:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to parse modality data" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
