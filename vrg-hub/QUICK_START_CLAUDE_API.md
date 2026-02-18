# Quick Start: Connect Claude API to Executive Dashboard

Your Executive Dashboard is already configured to use Claude AI! You just need to add your API key.

## ✅ What's Already Done

- ✅ Search box at top center of Executive Dashboard
- ✅ Edge function configured to use Claude API
- ✅ BigQuery integration for data queries
- ✅ Natural language to SQL conversion

## 🔑 Setup Your API Key (2 minutes)

### Step 1: Get Your Claude API Key

1. Go to https://console.anthropic.com/
2. Sign in or create an account
3. Click **API Keys** in the sidebar
4. Click **Create Key**
5. Copy the key (starts with `sk-ant-`)

### Step 2: Add to Supabase

**Option A: Supabase Dashboard** (Easiest)
1. Open your Supabase project: https://supabase.com/dashboard
2. Go to **Project Settings** → **Edge Functions**
3. Click **Secrets**
4. Add new secret:
   - Name: `ANTHROPIC_API_KEY`
   - Value: `sk-ant-api03-your-key-here`
5. Click **Save**

**Option B: Supabase CLI**
```bash
cd vrg-hub
supabase secrets set ANTHROPIC_API_KEY="sk-ant-api03-your-key-here"
```

### Step 3: Restart Edge Function

The edge function will automatically pick up the new secret on the next invocation. No restart needed!

## 🎯 Test It

1. Open the Executive Dashboard
2. Click the search box at the top (or press ⌘K / Ctrl+K)
3. Try: "Show me revenue for David Serich today"
4. The AI will convert your query to SQL and show results!

## 💡 Example Queries

- "Show me revenue for David Serich today"
- "What was total revenue last week?"
- "Top 5 radiologists by revenue this month"
- "CT volumes for all sites today"
- "Revenue breakdown by modality yesterday"

## 🔍 How It Works

1. You type a natural language question
2. Claude converts it to BigQuery SQL
3. SQL runs against your data warehouse
4. Results displayed with AI explanation

## 💰 Pricing

Claude API costs approximately:
- **$0.01-0.02 per query**
- Claude 3.5 Sonnet model
- Monitor at: https://console.anthropic.com/

## ❓ Troubleshooting

**"ANTHROPIC_API_KEY not configured"**
- Make sure you added the secret to Supabase
- Wait a few seconds for the secret to propagate

**Slow responses**
- First query may be slower (cold start)
- Subsequent queries are faster

**No results**
- Check your BigQuery data is available
- Try a simpler query first
- Check the browser console for errors

## 🚀 Advanced

For more advanced configuration options, see `CLAUDE_AI_SETUP.md`.

## 📊 Current Implementation

The edge function at `supabase/functions/executive-ai-query/index.ts`:
- Already integrates with Claude API ✅
- Converts natural language to SQL ✅
- Queries BigQuery data warehouse ✅
- Returns formatted results ✅

You just need to add your API key!
