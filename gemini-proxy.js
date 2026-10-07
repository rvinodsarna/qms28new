// Server-side proxy for Gemini API calls.
// The Gemini API key lives only in the Netlify environment variable
// GEMINI_API_KEY — it is never sent to or stored in the browser.
//
// Security hardening (2026-10):
//   - CORS restricted to same-origin requests plus an optional allow-list.
//   - Every request must carry a valid Supabase session bearer token.
//   - Best-effort per-user rate limit (in-memory; resets on cold-start).
//   - Request body size cap to prevent quota abuse.
//   - Upstream error details are logged server-side, never returned.

const EXTRA_ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map(function (s) { return s.trim(); })
    .filter(Boolean);

const SUPABASE_URL = process.env.SUPABASE_URL
    || "https://dilyshvzxpaplqnrievh.supabase.co";

const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY
    || "sb_publishable_g9mKIvBHNuo78WLAnAUIwg_lSi8KGt3";

const ALLOWED_MODELS = ["gemini-3.8-flash", "gemini-3.7-flash", "gemini-2.5-flash"];

const MAX_BODY_BYTES = 32 * 1024;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 20;

const rateBuckets = new Map();

function jsonResponse(statusCode, body, cors) {
    return {
        statusCode: statusCode,
        headers: Object.assign({}, cors || {}, { "Content-Type": "application/json" }),
        body: JSON.stringify(body),
    };
}

function isOriginAllowed(origin, host) {
    if (!origin) return true; // no Origin header = same-origin or server-to-server
    if (EXTRA_ALLOWED_ORIGINS.indexOf(origin) !== -1) return true;
    if (host) {
        try {
            const originHost = new URL(origin).host;
            if (originHost === host) return true; // same-origin request
        } catch (e) {
            return false;
        }
    }
    return false;
}

async function verifySession(authHeader) {
    if (!authHeader || authHeader.indexOf("Bearer ") !== 0) return null;
    const token = authHeader.slice(7).trim();
    if (!token) return null;
    try {
        const res = await fetch(SUPABASE_URL + "/auth/v1/user", {
            headers: {
                apikey: SUPABASE_ANON_KEY,
                Authorization: "Bearer " + token,
            },
        });
        if (!res.ok) return null;
        const user = await res.json();
        return user && user.id ? { id: user.id, email: user.email } : null;
    } catch (err) {
        console.error("[gemini-proxy] session verify failed:", err);
        return null;
    }
}

function checkRate(userId) {
    const now = Date.now();
    const bucket = (rateBuckets.get(userId) || []).filter(function (t) {
        return now - t < RATE_LIMIT_WINDOW_MS;
    });
    if (bucket.length >= RATE_LIMIT_MAX) {
        rateBuckets.set(userId, bucket);
        return false;
    }
    bucket.push(now);
    rateBuckets.set(userId, bucket);
    return true;
}

exports.handler = async function (event) {
    const reqOrigin = event.headers.origin || event.headers.Origin || "";
    const reqHost = event.headers.host || event.headers.Host || "";

    const originOk = isOriginAllowed(reqOrigin, reqHost);

    const cors = originOk && reqOrigin
        ? {
            "Access-Control-Allow-Origin": reqOrigin,
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Vary": "Origin",
        }
        : (originOk
            ? {
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
            }
            : {});

    if (event.httpMethod === "OPTIONS") {
        return { statusCode: 204, headers: cors, body: "" };
    }

    if (!originOk) {
        return {
            statusCode: 403,
            headers: { "Content-Type": "application/json", "Vary": "Origin" },
            body: JSON.stringify({ error: "Origin not allowed" }),
        };
    }

    if (event.httpMethod !== "POST") {
        return jsonResponse(405, { error: "Method not allowed" }, cors);
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("[gemini-proxy] GEMINI_API_KEY is not configured");
        return jsonResponse(500, { error: "Service misconfigured" }, cors);
    }

    const user = await verifySession(
        event.headers.authorization || event.headers.Authorization
    );
    if (!user) {
        return jsonResponse(401, { error: "Authentication required" }, cors);
    }

    if (!checkRate(user.id)) {
        return jsonResponse(429, { error: "Rate limit exceeded — try again shortly" }, cors);
    }

    const rawBody = event.body || "";
    if (rawBody.length > MAX_BODY_BYTES) {
        return jsonResponse(413, { error: "Request too large" }, cors);
    }

    let payload;
    try {
        payload = JSON.parse(rawBody || "{}");
    } catch (err) {
        return jsonResponse(400, { error: "Invalid JSON body" }, cors);
    }

    const model = ALLOWED_MODELS.indexOf(payload.model) !== -1
        ? payload.model
        : "gemini-2.5-flash";

    if (!payload.body || typeof payload.body !== "object") {
        return jsonResponse(400, { error: "Missing request body" }, cors);
    }

    try {
        const resp = await fetch(
            "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + apiKey,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload.body),
            }
        );
        const text = await resp.text();
        return {
            statusCode: resp.status,
            headers: Object.assign({}, cors, { "Content-Type": "application/json" }),
            body: text,
        };
    } catch (err) {
        console.error("[gemini-proxy] upstream request failed:", err);
        return jsonResponse(502, { error: "Upstream request failed" }, cors);
    }
};