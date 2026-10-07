// Cloudflare Workers entry point for QMS RISE.
// Routes:
//   POST /api/gemini-proxy  -> forwards to Google Gemini
//   OPTIONS /api/gemini-proxy -> CORS preflight
//   Everything else         -> static assets via env.ASSETS
//
// Security parity with the previous Netlify function (PR #3):
//   - CORS allow-list (same-origin + ALLOWED_ORIGINS env var)
//   - Requires valid Supabase session bearer token
//   - Per-user in-memory rate limit (20/min, resets on cold start)
//   - 32 KB body size cap
//   - Upstream error detail logged server-side only

const DEFAULT_ALLOWED_ORIGINS = [
    "https://qms28new.astrovinodsarna.workers.dev",
];

const ALLOWED_MODELS = ["gemini-3.8-flash"];
const MAX_BODY_BYTES = 32 * 1024;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 20;

const rateBuckets = new Map();

function jsonResponse(statusCode, body, cors) {
    return new Response(JSON.stringify(body), {
        status: statusCode,
        headers: Object.assign({}, cors || {}, { "Content-Type": "application/json" }),
    });
}

function extraOrigins(env) {
    return (env.ALLOWED_ORIGINS || "")
        .split(",")
        .map(function (s) { return s.trim(); })
        .filter(Boolean);
}

function isOriginAllowed(origin, host, env) {
    if (!origin) return true;
    if (DEFAULT_ALLOWED_ORIGINS.indexOf(origin) !== -1) return true;
    if (extraOrigins(env).indexOf(origin) !== -1) return true;
    try {
        if (new URL(origin).host === host) return true;
    } catch (e) { /* ignore */ }
    return false;
}

async function verifySession(authHeader, env) {
    if (!authHeader || authHeader.indexOf("Bearer ") !== 0) return null;
    const token = authHeader.slice(7).trim();
    if (!token) return null;
    const supabaseUrl = env.SUPABASE_URL || "https://dilyshvzxpaplqnrievh.supabase.co";
    const supabaseKey = env.SUPABASE_ANON_KEY || "sb_publishable_g9mKIvBHNuo78WLAnAUIwg_lSi8KGt3";
    try {
        const res = await fetch(supabaseUrl + "/auth/v1/user", {
            headers: {
                apikey: supabaseKey,
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

async function handleGeminiProxy(request, env) {
    const reqOrigin = request.headers.get("Origin") || "";
    const reqHost = request.headers.get("Host") || new URL(request.url).host;

    const originOk = isOriginAllowed(reqOrigin, reqHost, env);

    const cors = {};
    if (originOk) {
        if (reqOrigin) cors["Access-Control-Allow-Origin"] = reqOrigin;
        cors["Access-Control-Allow-Methods"] = "POST, OPTIONS";
        cors["Access-Control-Allow-Headers"] = "Content-Type, Authorization";
        cors["Vary"] = "Origin";
    }

    if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: cors });
    }

    if (!originOk) {
        return new Response(JSON.stringify({ error: "Origin not allowed" }), {
            status: 403,
            headers: { "Content-Type": "application/json", "Vary": "Origin" },
        });
    }

    if (request.method !== "POST") {
        return jsonResponse(405, { error: "Method not allowed" }, cors);
    }

    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("[gemini-proxy] GEMINI_API_KEY is not configured");
        return jsonResponse(500, { error: "Service misconfigured" }, cors);
    }

    const user = await verifySession(request.headers.get("Authorization"), env);
    if (!user) {
        return jsonResponse(401, { error: "Authentication required" }, cors);
    }

    if (!checkRate(user.id)) {
        return jsonResponse(429, { error: "Rate limit exceeded - try again shortly" }, cors);
    }

    const rawBody = await request.text();
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
        : "gemini-3.8-flash";

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
        return new Response(text, {
            status: resp.status,
            headers: Object.assign({}, cors, { "Content-Type": "application/json" }),
        });
    } catch (err) {
        console.error("[gemini-proxy] upstream request failed:", err);
        return jsonResponse(502, { error: "Upstream request failed" }, cors);
    }
}

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        if (url.pathname === "/api/gemini-proxy") {
            return handleGeminiProxy(request, env);
        }

        if (env.ASSETS) {
            return env.ASSETS.fetch(request);
        }

        return new Response("Not found", { status: 404 });
    },
};