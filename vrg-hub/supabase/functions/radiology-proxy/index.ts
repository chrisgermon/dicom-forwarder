import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CLOUD_RUN_URL = "https://crowdit-mcp-server-348600156950.australia-southeast1.run.app";

function getServiceAccountEmail(): string {
  const serviceAccountJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT");
  if (!serviceAccountJson) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT not configured");
  }

  let parsed: { client_email?: string };
  try {
    parsed = JSON.parse(serviceAccountJson);
  } catch {
    throw new Error("GOOGLE_SERVICE_ACCOUNT is not valid JSON");
  }

  const email = (parsed.client_email ?? "").trim();
  if (!email) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT missing client_email");
  }

  return email;
}

async function getIdToken(targetAudience: string): Promise<string> {
  const serviceAccountJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT");
  if (!serviceAccountJson) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT not configured");
  }

  const serviceAccount = JSON.parse(serviceAccountJson);
  
  // Create JWT for token exchange
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
    target_audience: targetAudience,
  };

  // Base64url encode
  const encoder = new TextEncoder();
  const base64url = (data: Uint8Array) => 
    btoa(String.fromCharCode(...data))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

  const headerB64 = base64url(encoder.encode(JSON.stringify(header)));
  const payloadB64 = base64url(encoder.encode(JSON.stringify(payload)));
  const signInput = `${headerB64}.${payloadB64}`;

  // Import private key and sign
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  const pemContents = serviceAccount.private_key
    .replace(pemHeader, "")
    .replace(pemFooter, "")
    .replace(/\s/g, "");
  
  const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));
  
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    encoder.encode(signInput)
  );

  const signatureB64 = base64url(new Uint8Array(signature));
  const jwt = `${signInput}.${signatureB64}`;

  // Exchange JWT for ID token
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const tokenText = await tokenResponse.text();

  if (!tokenResponse.ok) {
    throw new Error(`Token exchange failed (${tokenResponse.status}): ${tokenText}`);
  }

  let tokenData: { id_token?: string };
  try {
    tokenData = JSON.parse(tokenText);
  } catch {
    throw new Error(`Token exchange returned non-JSON response: ${tokenText}`);
  }

  if (!tokenData.id_token) {
    throw new Error(`Token exchange response missing id_token: ${tokenText}`);
  }

  return tokenData.id_token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    const { path, method = "GET", payload } = requestBody;
    
    console.log("Proxy request:", { path, method });
    
    if (!path) {
      throw new Error("Missing 'path' in request body");
    }

    // Get ID token for Cloud Run
    console.log("Getting ID token for:", CLOUD_RUN_URL);
    let idToken: string;
    try {
      idToken = await getIdToken(CLOUD_RUN_URL);
      console.log("ID token obtained successfully, length:", idToken.length);
    } catch (tokenError) {
      console.error("Token generation failed:", tokenError);
      throw new Error(`Token generation failed: ${tokenError instanceof Error ? tokenError.message : "Unknown error"}`);
    }

    // Forward request to Cloud Run
    const targetUrl = `${CLOUD_RUN_URL}${path}`;
    console.log("Forwarding to:", targetUrl);
    
    const serviceAccountEmail = getServiceAccountEmail();

    const fetchOptions: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${idToken}`,
        // Cloud Run service expects an API key header; we provide the service-account identity here
        // so we don't need a separate API key secret.
        "x-api-key": serviceAccountEmail,
      },
    };

    if (method !== "GET" && method !== "HEAD" && payload) {
      fetchOptions.body = JSON.stringify(payload);
    }

    const response = await fetch(targetUrl, fetchOptions);
    const responseText = await response.text();
    
    console.log("Cloud Run response status:", response.status);
    console.log("Cloud Run response body:", responseText.substring(0, 200));

    // Try to parse as JSON, otherwise return as text
    let parsed: unknown | null = null;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      parsed = null;
    }

    // IMPORTANT: Don't throw on upstream non-JSON errors.
    // Return the upstream status + body so the client can handle it gracefully.
    if (!response.ok) {
      const errorMessage = typeof parsed === "object" && parsed !== null
        ? JSON.stringify(parsed)
        : responseText;

      return new Response(
        JSON.stringify({ error: errorMessage, status: response.status }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = parsed ?? { response: responseText };

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Proxy error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
