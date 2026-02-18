// Using Deno.serve instead of deprecated import
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const authHeader = req.headers.get("Authorization")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });

    // Get user from auth token
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user profile and permissions
    const { data: profile } = await supabase
      .from("profiles")
      .select("*, user_roles(role)")
      .eq("id", user.id)
      .single();

    const userRole = profile?.user_roles?.[0]?.role || "requester";

    // Fetch brands and locations for AI matching
    const { data: brands } = await supabase
      .from("brands")
      .select("id, name, display_name")
      .eq("is_active", true)
      .order("sort_order");

    const { data: locations } = await supabase
      .from("locations")
      .select("id, name, brand_id")
      .eq("is_active", true)
      .order("sort_order");

    // Define available tools based on permissions
    const tools = [
      {
        type: "function",
        function: {
          name: "create_it_request",
          description: "Create a new IT support request. Automatically infer all details from the user's description.",
          parameters: {
            type: "object",
            properties: {
              title: { 
                type: "string", 
                description: "Brief, clear title summarizing the issue (max 100 chars)"
              },
              description: { 
                type: "string", 
                description: "Detailed description including what's broken, when it started, and any error messages"
              },
              location: { 
                type: "string", 
                description: "Physical location or department where the issue is occurring"
              },
              priority: {
                type: "string",
                enum: ["low", "medium", "high", "urgent"],
                description: "Priority: urgent=system down, high=major impact, medium=normal, low=minor"
              },
              brand_id: {
                type: "string",
                description: "UUID of the company/brand. Match location mentions to the appropriate brand."
              },
              location_id: {
                type: "string",
                description: "UUID of the specific location. Use fuzzy matching to find the best match."
              },
            },
            required: ["title", "description", "brand_id", "location_id"],
          },
        },
      },
    ];

    // Call Lovable AI with tools
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
            content: `You are a proactive AI assistant for an IT management system. Your role: ${userRole}.

Available Companies (Brands):
${brands?.map(b => `- ${b.display_name} (id: ${b.id})`).join('\n')}

Available Locations:
${locations?.map(l => `- ${l.name} (brand_id: ${l.brand_id}, id: ${l.id})`).join('\n')}

IMPORTANT INSTRUCTIONS:
- When users mention any IT issue or request, AUTOMATICALLY create the request using the create_it_request function
- DO NOT ask for additional details - infer them intelligently from the user's description
- Infer priority based on urgency: "not working/down/broken" = high, "slow/issue" = medium, "would like" = low
- Use intelligent fuzzy matching to find the best matching location and brand
- Create a clear, professional title that summarizes the issue in 5-8 words
- In the description, include all details the user provided plus any clarifying context

Location Matching Examples:
- "Rochedale" → Find location with "Rochedale" in name
- "Hampton" → Match to "Hampton East" or closest Hampton location
- "Woonona" → Match exact or closest match
- If no location mentioned, use the first available location as default

Examples:
User: "The printer in Rochedale is jammed"
→ Match "Rochedale" to location, find its brand_id, create request with matched location_id and brand_id

User: "My computer won't turn on at Hampton and I need it urgently"
→ Match "Hampton" to closest location (e.g., Hampton East), use its brand_id

User: "Can someone help fix the broken mouse?"
→ Use first/default location and its brand_id if no location mentioned

Be helpful, concise, and take action immediately rather than asking for more information.`,
          },
          { role: "user", content: prompt },
        ],
        tools,
        tool_choice: "auto",
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please contact support." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const message = aiData.choices[0].message;

    // Check if AI wants to call a function
    if (message.tool_calls && message.tool_calls.length > 0) {
      const toolCall = message.tool_calls[0];
      const functionName = toolCall.function.name;
      const functionArgs = JSON.parse(toolCall.function.arguments);

      // Execute the function
      if (functionName === "create_it_request") {
        const { data: request, error: requestError } = await supabase
          .from("requests")
          .insert({
            user_id: user.id,
            title: functionArgs.title,
            description: functionArgs.description,
            location: functionArgs.location || null,
            priority: functionArgs.priority || "medium",
            status: "open",
            type: "hardware",
            brand_id: functionArgs.brand_id || null,
            location_id: functionArgs.location_id || null,
          })
          .select()
          .single();

        if (requestError) {
          return new Response(
            JSON.stringify({
              response: `I encountered an error creating the request: ${requestError.message}`,
              error: true,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Get brand and location names for response
        const selectedBrand = brands?.find(b => b.id === functionArgs.brand_id);
        const selectedLocation = locations?.find(l => l.id === functionArgs.location_id);

        return new Response(
          JSON.stringify({
            response: `✅ I've created IT request #${request.id} for you!\n\n**${functionArgs.title}**\nCompany: ${selectedBrand?.display_name || 'Not specified'}\nLocation: ${selectedLocation?.name || functionArgs.location || 'Not specified'}\nPriority: ${functionArgs.priority || 'medium'}\n\nThe IT team has been notified and will review your request shortly.`,
            action: "create_request",
            requestId: request.id,
            requestUrl: `/requests/${request.id}`,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Return AI's text response if no function was called
    return new Response(
      JSON.stringify({
        response: message.content || "I'm not sure how to help with that.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("AI Assistant error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
