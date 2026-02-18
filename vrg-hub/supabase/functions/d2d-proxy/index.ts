import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const D2D_API_BASE = 'https://d2d.visionradiology.com.au';

/** Allow only path-only endpoints to prevent SSRF (no protocol, host, or @ in path). */
function isAllowedEndpoint(endpoint: string | null): boolean {
  if (!endpoint || typeof endpoint !== 'string') return false;
  const trimmed = endpoint.trim();
  // Must start with / and must not contain protocol-relative, host, or userinfo
  if (!trimmed.startsWith('/')) return false;
  if (trimmed.startsWith('//') || trimmed.includes('//')) return false;
  if (trimmed.includes('@') || trimmed.includes(':')) return false;
  // Optional: restrict to known API path prefix
  if (!trimmed.startsWith('/api/')) return false;
  return true;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const D2D_API_KEY = Deno.env.get('D2D_API_KEY');
    if (!D2D_API_KEY) {
      console.error('D2D_API_KEY is not set');
      return new Response(
        JSON.stringify({ error: 'Proxy misconfiguration' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const endpoint = url.searchParams.get('endpoint');

    if (!endpoint) {
      return new Response(
        JSON.stringify({ error: 'Missing endpoint parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!isAllowedEndpoint(endpoint)) {
      return new Response(
        JSON.stringify({ error: 'Invalid endpoint parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build the target URL (endpoint is path-only, safe from SSRF)
    const targetUrl = `${D2D_API_BASE}${endpoint}`;
    console.log(`Proxying ${req.method} request to: ${targetUrl}`);

    // Prepare headers for the proxied request
    const proxyHeaders: Record<string, string> = {
      'X-API-Key': D2D_API_KEY,
    };

    // Get request body if present
    let body: BodyInit | null = null;
    const contentType = req.headers.get('content-type');
    
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      if (contentType?.includes('multipart/form-data')) {
        // For multipart/form-data, we need to re-create the FormData
        // to ensure proper boundary handling when forwarding
        try {
          const incomingFormData = await req.formData();
          const outgoingFormData = new FormData();
          
          // Log what we received for debugging
          console.log('FormData entries received:');
          for (const [key, value] of incomingFormData.entries()) {
            if (value instanceof File) {
              console.log(`  ${key}: File(${value.name}, ${value.size} bytes, ${value.type})`);
              outgoingFormData.append(key, value, value.name);
            } else {
              console.log(`  ${key}: ${value}`);
              outgoingFormData.append(key, value);
            }
          }
          
          body = outgoingFormData;
          // Don't set Content-Type - let fetch set it with the correct boundary
        } catch (formError) {
          console.error('Error parsing FormData:', formError);
          // Fallback: pass through as-is
          body = await req.arrayBuffer();
          const originalContentType = req.headers.get('content-type');
          if (originalContentType) {
            proxyHeaders['Content-Type'] = originalContentType;
          }
        }
      } else if (contentType?.includes('application/json')) {
        body = await req.text();
        proxyHeaders['Content-Type'] = 'application/json';
      } else {
        body = await req.text();
        if (contentType) {
          proxyHeaders['Content-Type'] = contentType;
        }
      }
    }

    console.log(`Request headers:`, proxyHeaders);

    // Make the proxied request
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: proxyHeaders,
      body: body,
    });

    console.log(`Response status: ${response.status}`);

    // Get response body
    const responseContentType = response.headers.get('content-type');
    let responseBody: string | ArrayBuffer;
    
    if (responseContentType?.includes('application/json')) {
      responseBody = await response.text();
      console.log(`Response body:`, responseBody);
    } else {
      responseBody = await response.arrayBuffer();
    }

    // Build response headers
    const responseHeaders: Record<string, string> = {
      ...corsHeaders,
    };
    
    if (responseContentType) {
      responseHeaders['Content-Type'] = responseContentType;
    }

    return new Response(responseBody, {
      status: response.status,
      headers: responseHeaders,
    });

  } catch (error) {
    console.error('Proxy error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Proxy error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
