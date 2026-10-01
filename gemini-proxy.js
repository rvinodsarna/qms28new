// Server-side proxy for Gemini API calls.
// The Gemini API key lives only in the Netlify environment variable GEMINI_API_KEY —
// it is never sent to or stored in the browser. The client posts { model, body }
// and this function forwards the request to Google with the key attached server-side.

exports.handler = async function (event) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: "Gemini API key not configured on server" }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (e) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: "Invalid JSON body" }) };
  }

  // Only allow a small allowlist of known-safe Gemini models to prevent abuse.
  const allowedModels = ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash"];
  const model = allowedModels.includes(payload.model) ? payload.model : "gemini-2.5-flash";

  if (!payload.body || typeof payload.body !== "object") {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: "Missing request body" }) };
  }

  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload.body),
      }
    );
    const text = await resp.text();
    return {
      statusCode: resp.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: text,
    };
  } catch (err) {
    return { statusCode: 502, headers: corsHeaders, body: JSON.stringify({ error: "Upstream request failed", detail: String(err) }) };
  }
};
