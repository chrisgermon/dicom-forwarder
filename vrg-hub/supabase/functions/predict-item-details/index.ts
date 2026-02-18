// Using Deno.serve instead of deprecated import

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PredictionRequest {
  itemName: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { itemName }: PredictionRequest = await req.json();
    
    if (!itemName || itemName.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Item name is required" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Predicting details for item:', itemName);

    const systemPrompt = `You are a helpful assistant that predicts hardware item details for IT procurement in Australia.
Given a hardware item name, provide realistic predictions for the Australian market:
- vendor (likely Australian supplier or manufacturer available in Australia)
- model_number (typical model designation available in Australia)
- unit_price (estimated price in AUD - Australian dollars)
- description (brief technical specifications)

IMPORTANT: 
- All prices must be in AUD (Australian dollars)
- Focus on vendors and suppliers that operate in Australia
- Consider Australian market pricing, which may be higher than US prices
- Use realistic Australian retail/wholesale pricing

Return ONLY a JSON object with these exact fields. Be realistic and practical for the Australian market.`;

    const userPrompt = `Predict details for this hardware item in Australia: "${itemName}"

Return a JSON object with:
- vendor: string (Australian supplier/manufacturer name, e.g., "JB Hi-Fi", "Officeworks", "Mwave", or international brands available in Australia)
- model_number: string (typical model number)
- unit_price: number (estimated price in AUD - Australian dollars, consider Australian pricing)
- description: string (brief specs/description)

Remember: Prices should be in AUD and reflect the Australian market.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { 
            status: 429, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits depleted. Please add credits to your workspace." }),
          { 
            status: 402, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error('AI Gateway request failed');
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in AI response');
    }

    console.log('AI response:', content);

    // Extract JSON from the response
    let predictions;
    try {
      // Try to parse the entire content as JSON
      predictions = JSON.parse(content);
    } catch {
      // If that fails, try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        predictions = JSON.parse(jsonMatch[1]);
      } else {
        // Last resort: try to find JSON object in the text
        const objectMatch = content.match(/\{[\s\S]*\}/);
        if (objectMatch) {
          predictions = JSON.parse(objectMatch[0]);
        } else {
          throw new Error('Could not parse JSON from AI response');
        }
      }
    }

    // Validate the response structure
    const validatedPredictions = {
      vendor: predictions.vendor || '',
      model_number: predictions.model_number || '',
      unit_price: typeof predictions.unit_price === 'number' ? predictions.unit_price : 0,
      description: predictions.description || '',
    };

    return new Response(
      JSON.stringify({ predictions: validatedPredictions }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in predict-item-details function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

Deno.serve(handler);
