# Security Assessment

Assessment date: February 2025. Summary of findings and recommended fixes.

---

## Critical

### 1. Hardcoded API key in d2d-proxy

**File:** `supabase/functions/d2d-proxy/index.ts`  
**Issue:** The D2D API key is hardcoded in source:

```ts
const D2D_API_KEY = 'd2d-qR6Zp3beHiEl-dGf_2nqXtXpWGZq_ME-bdPWrAaUH7o';
```

**Risk:** Key is exposed in version control and to anyone with repo access; rotation requires a code change.

**Recommendation:** Use Supabase secrets (e.g. `D2D_API_KEY`) and read via `Deno.env.get('D2D_API_KEY')`. Set with:

```bash
supabase secrets set D2D_API_KEY="your-key"
```

**Status:** Fixed in code: d2d-proxy now reads `D2D_API_KEY` from env. You must set the secret before deploying: `supabase secrets set D2D_API_KEY="d2d-..."`

---

### 2. SSRF in d2d-proxy (user-controlled URL)

**File:** `supabase/functions/d2d-proxy/index.ts`  
**Issue:** The `endpoint` query parameter is concatenated into the request URL without validation:

```ts
const targetUrl = `${D2D_API_BASE}${endpoint}`;
```

An attacker can pass e.g. `endpoint=@evil.com/` so that the resolved URL host becomes `evil.com`, causing the server to send the API key and request to an attacker-controlled host.

**Recommendation:** Validate `endpoint` so it is only a path (no `//`, `@`, `:`, or leading slash that could change the host). Allow only whitelisted path prefixes (e.g. `/api/`) and reject otherwise.

---

## High

### 3. Unauthenticated d2d-proxy

**File:** `supabase/config.toml`  
**Issue:** `[functions.d2d-proxy]` has `verify_jwt = false`, so anyone can call the proxy without being logged in.

**Recommendation:** If the proxy should only be used by logged-in users, set `verify_jwt = true`. If it must stay public, ensure SSRF and key exposure are fixed and that the proxy does not expose sensitive data.

---

### 4. Request attachments storage – over-permissive read

**Files:** `supabase/migrations/20251016223458_*.sql` and earlier migrations  
**Issue:** Policy "Users can view request attachments" only checks `bucket_id = 'request-attachments'`, so any authenticated user can read any object in that bucket. An earlier migration had correctly restricted by `auth.uid()::text = (storage.foldername(name))[1]`.

**Risk:** Any authenticated user can view other users’ request attachments (IDOR / data exposure).

**Recommendation:** Restrict SELECT so that the object path is tied to the current user or to a request the user is allowed to access (e.g. first path segment = user id or request id with a join to request access). Remove or tighten the policy that allows all authenticated users to read from the bucket.

---

### 5. XSS via unsanitized AI response (AnalyticsAI)

**File:** `src/pages/AnalyticsAI.tsx`  
**Issue:** Assistant messages are rendered with `dangerouslySetInnerHTML` and `formatResponse(message.content)`. `formatResponse` only does regex replacements (e.g. `**bold**` → `<strong>`) and does not sanitize HTML. If the AI or upstream returns HTML/script, it will be executed.

**Recommendation:** Sanitize before rendering, e.g. run the formatted string through `DOMPurify.sanitize()` (or your existing `sanitizeHtml` from `@/lib/sanitizer`) and then pass the result to `dangerouslySetInnerHTML`.

---

### 6. XSS via embed code module

**File:** `src/components/page-modules/EmbedCodeModule.tsx`  
**Issue:** `content.code` is rendered with `dangerouslySetInnerHTML` without sanitization. If embed code is stored from user or admin input, it can contain script and lead to XSS.

**Recommendation:** Either:
- Sanitize with DOMPurify (may break legitimate iframes/embeds; use a config that allows safe iframe `src` only), or
- Restrict who can create/edit embed modules and treat that content as trusted; document the risk and avoid storing arbitrary HTML from untrusted users.

---

## Medium

### 7. Accordion module HTML not sanitized

**File:** `src/components/page-modules/AccordionModule.tsx`  
**Issue:** `item.content` is rendered with `dangerouslySetInnerHTML` with no sanitization. Content is typically from page/CMS editors.

**Recommendation:** Sanitize with `sanitizeHtml()` or `sanitizeRichHtml()` from `@/lib/sanitizer` before rendering. Apply the same approach to other page modules that render stored HTML.

---

### 8. Edge functions with verify_jwt = false

**File:** `supabase/config.toml`  
**Issue:** Several functions have `verify_jwt = false` (e.g. `send-newsletter-reminder`, `handle-incoming-email`, `pipedream-cron`, `mlo-bigquery-performance`, `validate-mlo-performance-share`, `d2d-proxy`, `generate-campaign-report`). Some are intentional (webhooks, cron, public share links); others may be overly permissive.

**Recommendation:** For each function, confirm whether unauthenticated access is required. Where it is not, set `verify_jwt = true`. For webhooks/cron, use a shared secret or other server-side auth instead of disabling JWT verification without an alternative check.

---

## Low / informational

### 9. CORS Allow-Origin: *

**Files:** Various Supabase edge functions  
**Issue:** Many functions set `'Access-Control-Allow-Origin': '*'`, which allows any origin to call them from the browser.

**Recommendation:** For production, restrict to your app’s origins (e.g. `https://yourdomain.com`) where possible.

---

### 10. Chart component style injection

**File:** `src/components/ui/chart.tsx`  
**Issue:** `dangerouslySetInnerHTML` is used to inject CSS built from theme config and `id`. If `id` is user-controlled, it could inject into the style context (limited impact if `id` is from props and not sanitized).

**Recommendation:** Ensure `id` is generated or constrained (e.g. from a fixed set or sanitized) and not taken directly from user input.

---

## Positive notes

- **RequestDetail, ArticleView, PageViewer, EmailReader, RequestComments, etc.:** Use DOMPurify or `sanitizeHtml` / `sanitizeRichHtml` before `dangerouslySetInnerHTML`.
- **Supabase usage:** Queries use parameterized patterns (e.g. `.eq('id', id)`), reducing SQL injection risk.
- **Secrets in edge functions:** Other functions use `Deno.env.get()` for API keys and secrets; only d2d-proxy had a hardcoded key in this review.
- **MLO share links:** Token validation and expiration are checked in `validate-mlo-performance-share` and `mlo-bigquery-performance`.

---

## Summary

| Severity | Count | Action |
|----------|--------|--------|
| Critical | 2      | Fix immediately (key + SSRF in d2d-proxy) |
| High     | 4      | Fix soon (auth, storage policy, XSS in AnalyticsAI and EmbedCode) |
| Medium   | 2      | Plan fixes (Accordion sanitization, verify_jwt review) |
| Low      | 2      | Optional hardening (CORS, chart id) |
