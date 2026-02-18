const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { count = 5 } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are a professional medical news writer specializing in Australian radiology. 
Generate realistic, informative news articles about radiology developments, technology, healthcare policy, and medical imaging in Australia.
Each article should be professional, accurate-sounding, and relevant to radiology professionals.
Include realistic details about Australian healthcare settings, cities, and institutions.`;

    const userPrompt = `Generate ${count} distinct Australian radiology news articles. 
For each article, provide:
1. A compelling title (50-80 characters)
2. A brief excerpt/summary (100-150 characters)
3. Full article content in HTML format (300-500 words) with proper paragraphs using <p> tags
4. 2-4 relevant tags (comma-separated)

Make each article unique and cover different aspects of radiology such as:
- New imaging technology and equipment
- Healthcare policy changes affecting radiology
- Research breakthroughs in medical imaging
- Training and education updates
- Teleradiology and remote diagnostics
- Patient care improvements
- Workforce and staffing news
- Regulatory updates

Return ONLY a valid JSON array with this exact structure, no additional text:
[
  {
    "title": "Article title here",
    "excerpt": "Brief summary here",
    "content": "<p>Full article content with HTML paragraphs</p><p>More content...</p>",
    "tags": "technology,AI,imaging"
  }
]`;

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
          { role: "user", content: userPrompt },
        ],
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to generate articles" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Extract JSON from markdown code blocks if present
    let jsonContent = content;
    const jsonMatch = content.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
    if (jsonMatch) {
      jsonContent = jsonMatch[1];
    }
    
    const articles = JSON.parse(jsonContent);

    return new Response(JSON.stringify({ articles }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in generate-radiology-news:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
