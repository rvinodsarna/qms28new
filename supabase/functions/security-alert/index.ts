import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALERT_TO = Deno.env.get("SECURITY_ALERT_EMAIL") || "vinod@unimy.edu.my";
const ALERT_FROM_NAME = "QMS Security";
const SUPPRESSION_HOURS = 24;
const QMS_URL = "https://qms28new.astrovinodsarna.workers.dev";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sendAlertEmail(d: {
  eventType: string;
  severity: string;
  email: string;
  ip: string;
  userAgent: string;
  timestamp: string;
  extras?: Record<string, unknown>;
}) {
  const apiKey = Deno.env.get("BREVO_API_KEY");
  const senderEmail = Deno.env.get("BREVO_SENDER_EMAIL");
  if (!apiKey || !senderEmail) throw new Error("Missing BREVO_API_KEY or BREVO_SENDER_EMAIL");

  const sevColor =
    d.severity === "critical" ? "#ff5468" :
    d.severity === "high" ? "#ff9b64" : "#ffc857";

  const html = `
    <div style="font-family:Segoe UI,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#0a1020;color:#e5f6ff;border-radius:12px;">
      <div style="font-size:20px;font-weight:800;color:${sevColor};margin-bottom:8px;">
        SECURITY ALERT - ${d.severity.toUpperCase()}
      </div>
      <div style="font-size:13px;color:#8ab4c8;margin-bottom:20px;">
        A suspicious event was detected on the QMS RISE system.
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <tr><td style="padding:8px 0;color:#8ab4c8;width:140px;">Event type:</td><td style="padding:8px 0;"><strong>${d.eventType}</strong></td></tr>
        <tr><td style="padding:8px 0;color:#8ab4c8;">Target email:</td><td style="padding:8px 0;"><strong>${d.email || "-"}</strong></td></tr>
        <tr><td style="padding:8px 0;color:#8ab4c8;">IP address:</td><td style="padding:8px 0;font-family:monospace;">${d.ip || "unknown"}</td></tr>
        <tr><td style="padding:8px 0;color:#8ab4c8;">Timestamp:</td><td style="padding:8px 0;">${new Date(d.timestamp).toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur" })}</td></tr>
        <tr><td style="padding:8px 0;color:#8ab4c8;">User agent:</td><td style="padding:8px 0;font-size:11px;color:#8ab4c8;">${(d.userAgent || "").slice(0, 120)}</td></tr>
      </table>
      ${d.extras ? `<div style="margin-top:16px;padding:12px;background:rgba(0,0,0,.3);border-radius:8px;font-family:monospace;font-size:11px;color:#8ab4c8;white-space:pre-wrap;">${JSON.stringify(d.extras, null, 2)}</div>` : ""}
      <div style="margin-top:20px;padding-top:16px;border-top:1px solid rgba(255,255,255,.08);font-size:12px;color:#8ab4c8;">
        Review full log at QMS Dashboard.<br/>
        Alerts are throttled: same email won't trigger another alert for ${SUPPRESSION_HOURS}h.
      </div>
      <div style="margin-top:16px;font-size:11px;color:#8ab4c8;opacity:.7;">
        Do not reply. Automated security notification from QMS RISE.
      </div>
    </div>`;

  const text = `SECURITY ALERT - ${d.severity.toUpperCase()}

Event: ${d.eventType}
Email: ${d.email}
IP: ${d.ip}
Time: ${d.timestamp}
UA: ${d.userAgent}

Review at ${QMS_URL}`;

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify({
      sender: { name: ALERT_FROM_NAME, email: senderEmail },
      to: [{ email: ALERT_TO }],
      subject: `[${d.severity.toUpperCase()}] ${d.eventType} - QMS RISE`,
      htmlContent: html,
      textContent: text,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`Brevo ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const payload = await req.json();
    const record = payload?.record;
    if (!record) return json({ error: "No record in payload" }, 400);

    const severity = String(record.severity || "low").toLowerCase();
    if (severity === "low") {
      console.log("[security-alert] low severity - skipped");
      return json({ skipped: "low severity" });
    }

    const targetEmail = String(record.email || "").trim().toLowerCase();
    if (!targetEmail) {
      console.log("[security-alert] no target email - skipped");
      return json({ skipped: "no email" });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const cutoff = new Date(Date.now() - SUPPRESSION_HOURS * 60 * 60 * 1000).toISOString();
    const { data: existing } = await supabaseAdmin
      .from("security_alert_suppression")
      .select("last_alert_at")
      .eq("email", targetEmail)
      .maybeSingle();

    if (existing?.last_alert_at && existing.last_alert_at > cutoff) {
      console.log("[security-alert] suppressed (within 24h):", targetEmail);
      return json({ suppressed: true, last_alert_at: existing.last_alert_at });
    }

    await sendAlertEmail({
      eventType: record.event_type || "unknown",
      severity,
      email: targetEmail,
      ip: record.ip_address || "unknown",
      userAgent: record.user_agent || "unknown",
      timestamp: record.created_at || new Date().toISOString(),
      extras: record.details || undefined,
    });

    await supabaseAdmin
      .from("security_alert_suppression")
      .upsert({ email: targetEmail, last_alert_at: new Date().toISOString() });

    console.log("[security-alert] alert sent to", ALERT_TO, "for", targetEmail);
    return json({ sent: true, to: ALERT_TO, about: targetEmail });
  } catch (e) {
    console.error("[security-alert] error:", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});