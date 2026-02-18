# Claude AI Integration Setup Guide

This guide will help you integrate Claude AI into the Executive Dashboard search functionality.

## Prerequisites

- A Claude account with API access
- Supabase project with edge functions enabled

## Step 1: Get Your Claude API Key

1. Go to https://console.anthropic.com/
2. Sign in or create an account
3. Navigate to **API Keys** in the settings
4. Click **Create Key**
5. Copy your API key (it starts with `sk-ant-`)

## Step 2: Add API Key to Supabase

### Option A: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **Project Settings** > **Edge Functions**
3. Click on **Secrets**
4. Add a new secret:
   - Name: `ANTHROPIC_API_KEY`
   - Value: Your Claude API key (e.g., `sk-ant-api03-...`)
5. Save the secret

### Option B: Using Supabase CLI

```bash
# Set the API key as an environment variable
supabase secrets set ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
```

## Step 3: Update the Edge Function

The edge function at `supabase/functions/executive-ai-query/index.ts` needs to be updated to use the Claude API.

Here's the updated edge function code:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

serve(async (req) => {
  try {
    const { query } = await req.json();

    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    // Initialize Supabase client to fetch data
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Fetch recent revenue data for context
    const { data: revenueData, error: dataError } = await supabaseClient
      .from("vw_Revenue_Enhanced")
      .select("*")
      .limit(100);

    if (dataError) throw dataError;

    // Create context from data
    const dataContext = `Here's recent revenue data:\n${JSON.stringify(revenueData, null, 2)}`;

    // Call Claude API
    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: `You are an AI assistant for Vision Radiology Group's executive dashboard.

Context: ${dataContext}

User query: ${query}

Please analyze the data and provide a helpful response. If showing numerical data, format it clearly.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.statusText}`);
    }

    const result = await response.json();
    const assistantMessage = result.content[0].text;

    return new Response(
      JSON.stringify({
        response: assistantMessage,
        results: revenueData,
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        error: error.message,
        response: "I encountered an error processing your query. Please try again.",
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
```

## Step 4: Deploy the Edge Function

```bash
# Deploy the updated edge function
supabase functions deploy executive-ai-query
```

## Step 5: Test the Integration

1. Open the Executive Dashboard
2. Use the search box at the top center
3. Try an example query like "Show me revenue for today"
4. The AI should respond with data from your BigQuery warehouse

## Troubleshooting

### "ANTHROPIC_API_KEY not configured" Error

- Make sure you've added the API key to Supabase secrets
- Redeploy the edge function after adding secrets

### API Rate Limits

Claude API has rate limits based on your plan:
- Free tier: Limited requests per day
- Paid plans: Higher limits

Monitor your usage at https://console.anthropic.com/

### Slow Responses

- The AI needs to fetch data and process it
- Consider caching frequently requested data
- Use pagination for large datasets

## Security Best Practices

1. **Never expose your API key** in client-side code
2. Always use the edge function for API calls
3. Implement rate limiting to prevent abuse
4. Monitor API usage regularly
5. Rotate API keys periodically

## Cost Considerations

Claude API pricing (as of 2024):
- Claude 3.5 Sonnet: ~$3/million input tokens, ~$15/million output tokens
- Typical query: 500-1000 tokens per request
- Estimated cost: $0.01-0.02 per query

Monitor your costs at https://console.anthropic.com/

## Advanced Configuration

### Custom System Prompts

Edit the edge function to customize the AI's behavior:

```typescript
const systemPrompt = `You are a specialized AI assistant for radiology analytics.
Focus on:
- Revenue analysis
- Volume metrics
- Radiologist performance
- Worksite comparisons

Always provide specific numbers and cite data sources.`;
```

### Adding More Data Sources

Extend the edge function to query additional views:

```typescript
// Fetch multiple data sources
const [revenueData, volumeData, radiologistData] = await Promise.all([
  supabaseClient.from("vw_Revenue_Enhanced").select("*"),
  supabaseClient.from("vw_Study_Volume").select("*"),
  supabaseClient.from("vw_Radiologist_Activity").select("*"),
]);
```

## Support

For issues:
- Claude API: https://support.anthropic.com
- Supabase: https://supabase.com/support
- VRG Hub: Open an issue in the repository
