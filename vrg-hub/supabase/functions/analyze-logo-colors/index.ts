const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { logoUrl } = await req.json();

    if (!logoUrl) {
      return new Response(
        JSON.stringify({ error: 'Logo URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if the logo is an SVG file
    if (logoUrl.toLowerCase().endsWith('.svg')) {
      return new Response(
        JSON.stringify({ error: 'SVG logos are not supported. Please upload a PNG or JPG logo for AI color analysis.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Analyzing logo:', logoUrl);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this company logo and extract a professional color scheme suitable for a web application. 
                
Return a JSON object with these HSL color values (format: "hue saturation% lightness%"):
- primary_color: Main brand color (prominent in logo)
- secondary_color: Complementary light background color
- accent_color: Accent color for highlights
- background_color: Main background (usually white or very light)
- foreground_color: Main text color (dark)
- muted_color: Subtle background for cards
- muted_foreground_color: Secondary text color
- card_color: Card background color
- card_foreground_color: Card text color
- border_color: Border color for UI elements

Ensure good contrast ratios for accessibility. Return ONLY valid JSON, no other text.`
              },
              {
                type: 'image_url',
                image_url: { url: logoUrl }
              }
            ]
          }
        ],
        temperature: 0.3
      })
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits depleted. Please add credits to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      // Handle 400 errors with specific message
      if (response.status === 400) {
        let errorMessage = 'Unable to analyze logo. ';
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.error?.message?.includes('Failed to extract')) {
            errorMessage += 'The image format may not be supported. Please try uploading a different logo (PNG or JPG recommended).';
          } else {
            errorMessage += errorData.error?.message || 'Invalid request.';
          }
        } catch {
          errorMessage += 'Please try uploading a different logo format.';
        }
        return new Response(
          JSON.stringify({ error: errorMessage }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in AI response');
    }

    console.log('AI Response:', content);

    // Parse JSON from response (handle markdown code blocks if present)
    let colors;
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      colors = JSON.parse(jsonStr.trim());
    } catch (e) {
      console.error('Failed to parse JSON:', e);
      throw new Error('Invalid JSON response from AI');
    }

    return new Response(
      JSON.stringify({ colors }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-logo-colors:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to analyze logo colors';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
