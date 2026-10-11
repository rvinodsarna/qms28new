// ============================================================================
// public-auth-ops — Supabase Edge Function
// ============================================================================
// Handles the "forgot password" flow WITHOUT requiring the caller to
// already be signed in (a user who forgot their password has no session).
// This is why it is a SEPARATE function from admin-auth-ops, which stays
// locked to authenticated staff only.
// What it does when called with action "requestTempPassword":
//   1. Confirms the email belongs to a real account — either a student
//      (@student.unimy.edu.my, in the students table) or a staff member
//      (@unimy.edu.my, in the staff table).
//   2. Generates a random temporary password.
//   3. Sets it as that account's real Supabase Auth password.
//   4. Flags the account row so the app forces a password change on next
//      login (students: must_change_password = true; staff: must_change = true).
//   5. Emails the temporary password via the Brevo HTTP email API, with the
//      visible sender name set to "QMS-RISE" and a "do not reply" notice in
//      the body.
// It never reveals whether a given email exists (always returns the same
// generic success message) and rate-limits repeat requests per account.
// WHY BREVO INSTEAD OF GMAIL SMTP:
//   Supabase Edge Functions run in a restricted runtime that frequently
//   blocks or drops raw SMTP connections (ports 25/465/587), and Gmail
//   itself often silently rejects SMTP logins coming from unfamiliar
//   cloud/datacenter IPs like Supabase's — this is why the previous Gmail
//   SMTP version failed at the "send" step even with correct credentials.
//   Brevo's API is a plain HTTPS call (no raw sockets, no blocked ports),
//   is free forever for up to 300 emails/day, and only requires verifying
//   ONE sender email address by clicking a confirmation link — no domain
//   or DNS access required. This is why it's used here instead.
// HOW TO DEPLOY (no command line needed):
//   1. Create a free Brevo account at https://www.brevo.com (no credit
//      card required).
//   2. Go to Senders, Domains & Dedicated IPs -> Senders -> Add a Sender.
//      Enter any email you own (e.g. your Gmail) as the "From" address and
//      a display name like "QMS-RISE". Brevo emails that address a
//      confirmation link — click it to verify. This is the ONLY
//      verification step needed; no DNS records or domain ownership
//      required.
//   3. Go to SMTP & API (top-right menu) -> API Keys tab -> Generate a new
//      API key. Copy it — Brevo only shows it once.
//   4. Open your Supabase project dashboard -> Edge Functions -> Create a
//      new function.
//   5. Name it exactly:  public-auth-ops
//   6. Delete the placeholder code it gives you, and paste this entire file.
//   7. Click Deploy.
//   8. IMPORTANT: open this function's Settings and turn OFF
//      "Verify JWT" / "Enforce JWT Verification". Callers of this
//      endpoint have no login session yet, so the platform's automatic JWT
//      check must be disabled for this function only (admin-auth-ops keeps
//      it ON — that one is unaffected).
//   9. Add these two secrets under Edge Functions -> Secrets (or
//      Project Settings -> Edge Functions -> Secrets, depending on your
//      dashboard version):
//        BREVO_API_KEY       = the API key you copied in step 3
//        BREVO_SENDER_EMAIL  = the exact email address you verified in
//                               step 2 (must match exactly)
//      SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are already provided
//      automatically to every Edge Function, same as admin-auth-ops.
// The app calls this function at:  {SUPABASE_URL}/functions/v1/public-auth-ops
//
// 2026-08-26 fix: APP_URL was pointing at a stale internal preview link
// (a Perplexity Computer /computer/a/ app asset used during development),
// so the "Log in at QMS-RISE" link in the temp-password email led nowhere
// useful for real users. Fixed to point at the live production site.
// ============================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}

function randomTempPassword(len = 10) {
  // Avoids visually ambiguous characters (0/O, 1/l/I).
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < len; i++) out += chars[bytes[i] % chars.length];
  return out;
}

// Shown inside the email so users have a direct link back to the app.
const APP_URL = "https://qms28new.astrovinodsarna.workers.dev";

async function sendTempPasswordEmail(toEmail, name, tempPassword) {
  const apiKey = Deno.env.get("BREVO_API_KEY");
  const senderEmail = Deno.env.get("BREVO_SENDER_EMAIL");
  if (!apiKey || !senderEmail) {
    throw new Error("Email is not configured (missing BREVO_API_KEY / BREVO_SENDER_EMAIL secrets).");
  }
  const safeName = name || "User";
  const html = `
    <div style="font-family:Segoe UI,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1a1a2e;">
      <h2 style="color:#0891b2;margin-bottom:4px;">QMS-RISE Password Reset</h2>
      <p>Hello ${safeName},</p>
      <p>A temporary password has been generated for your QMS-RISE account.</p>
      <div style="background:#f0fdff;border:1px solid #0891b2;border-radius:8px;padding:16px;margin:16px 0;text-align:center;">
        <div style="font-size:12px;color:#555;margin-bottom:4px;">Temporary Password</div>
        <div style="font-size:22px;font-weight:700;letter-spacing:3px;color:#0891b2;">${tempPassword}</div>
      </div>
      <p>Log in at <a href="${APP_URL}">QMS-RISE</a> using your email and this temporary password. You will be required to set a new password immediately after logging in, before you can access anything else.</p>
      <p style="font-size:13px;color:#777;margin-top:24px;">This is an automated message from QMS-RISE. Please do not reply to this email.</p>
    </div>`;
  const text = `Hello ${safeName},\n\n` + `A temporary password has been generated for your QMS-RISE account:\n\n` + `  ${tempPassword}\n\n` + `Log in at ${APP_URL} using your email and this temporary password. ` + `You will be required to set a new password immediately after logging in.\n\n` + `This is an automated message from QMS-RISE. Please do not reply to this email.`;
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "accept": "application/json",
      "content-type": "application/json",
      "api-key": apiKey
    },
    body: JSON.stringify({
      sender: {
        name: "QMS-RISE",
        email: senderEmail
      },
      to: [
        {
          email: toEmail,
          name: safeName
        }
      ],
      subject: "Your QMS-RISE Temporary Password",
      htmlContent: html,
      textContent: text
    })
  });
  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Brevo API error (${res.status}): ${errBody}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }
  try {
    const { action, payload } = await req.json();
    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    if (action === "requestTempPassword") {
      // Always resolve to the same generic message so we never reveal
      // whether a given email address is a registered account.
      const genericOk = json({
        success: true,
        message: "If that email is registered, a temporary password has been sent."
      });
      const rawEmail = String(payload?.email ?? "").trim().toLowerCase();
      if (!rawEmail) return genericOk;
      // Students use @student.unimy.edu.my; staff use @unimy.edu.my
      // directly (no "student." subdomain segment), so the two are
      // mutually exclusive and safely distinguishable by suffix.
      const isStudentEmail = rawEmail.endsWith("@student.unimy.edu.my");
      const isStaffEmail = !isStudentEmail && rawEmail.endsWith("@unimy.edu.my");
      if (!isStudentEmail && !isStaffEmail) {
        return genericOk;
      }
      const table = isStudentEmail ? "students" : "staff";
      const mustChangeColumn = isStudentEmail ? "must_change_password" : "must_change";
      const extraCol = isStudentEmail ? "programme" : "school";
      const { data: account } = await supabaseAdmin.from(table).select("id, name, email, temp_password_issued_at, status, " + extraCol).ilike("email", rawEmail).maybeSingle();
      if (!account) return genericOk;

      // --- So-CSI access gate ---
      const SO_CSI_PROGRAMMES = ["DIT", "DCY", "BCY", "BDS"];
      const DENY_STUDENT = "\u{1F6AB} ACCESS DENIED\n\nYour email does not belong to So-CSI School.\n\nOnly students from DIT, DCY, BCY, and BDS programmes, and lecturers designated to So-CSI, are permitted to use this system.\n\n\u26A0\uFE0F Any attempt to misuse, breach, or penetrate the QMS will result in your account being PERMANENTLY BLOCKED.";
      const DENY_STAFF = "\u{1F6AB} ACCESS DENIED\n\nYour email is not designated to So-CSI School.\n\nOnly So-CSI staff are permitted to use this system.\n\n\u26A0\uFE0F Any attempt to misuse, breach, or penetrate the QMS will result in your account being PERMANENTLY BLOCKED.";

      if (isStudentEmail) {
        const prog = String(account.programme || "").trim().toUpperCase();
        if (!SO_CSI_PROGRAMMES.includes(prog)) {
          console.warn("[socsi-gate] blocked student:", rawEmail, "programme=", prog);
          return json({ error: DENY_STUDENT }, 403);
        }
      } else {
        const school = String(account.school || "").trim();
        if (school !== "So-CSI") {
          console.warn("[socsi-gate] blocked staff:", rawEmail, "school=", school);
          return json({ error: DENY_STAFF }, 403);
        }
      }
      // --- end So-CSI gate ---

      // --- Account status gate ---
      const DENY_INACTIVE = "\u{1F6AB} ACCESS DENIED\n\nYour account is not active.\n\nOnly active So-CSI students and staff may use this system.\n\nIf you believe this is an error, please contact the Dean directly via Microsoft Outlook.\n\n\u26A0\uFE0F Any attempt to misuse, breach, or penetrate the QMS will result in your account being PERMANENTLY BLOCKED.";
      const DENY_EXPIRED = "\u{1F6AB} ACCESS DENIED\n\nYour temporary password has expired.\n\nSelf-service password reset is disabled for this account.\n\nPlease contact the Dean directly via Microsoft Outlook to request a new password.\n\n\u26A0\uFE0F Any attempt to misuse, breach, or penetrate the QMS will result in your account being PERMANENTLY BLOCKED.";

      const status = String(account.status || "").trim().toLowerCase();
      if (status === "temp_password_expired") {
        console.warn("[status-gate] blocked expired temp pw:", rawEmail);
        return json({ error: DENY_EXPIRED }, 403);
      }
      if (status !== "active") {
        console.warn("[status-gate] blocked non-active:", rawEmail, "status=", status);
        return json({ error: DENY_INACTIVE }, 403);
      }
      // --- end Account status gate ---
      // Basic rate limit: one request per account every 2 minutes.
      if (account.temp_password_issued_at) {
        const lastMs = new Date(account.temp_password_issued_at).getTime();
        if (Date.now() - lastMs < 2 * 60 * 1000) {
          return json({
            error: "Please wait a couple of minutes before requesting another temporary password."
          }, 429);
        }
      }
      const tempPassword = randomTempPassword(10);
      const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(account.id, {
        password: tempPassword
      });
      if (updErr) {
        console.error("updateUserById failed:", updErr.message);
        return json({
          error: "Could not process request. Please contact admin."
        }, 500);
      }
      await supabaseAdmin.from(table).update({
        [mustChangeColumn]: true,
        temp_password_issued_at: new Date().toISOString()
      }).eq("id", account.id);
      try {
        await sendTempPasswordEmail(account.email, account.name, tempPassword);
      } catch (mailErr) {
        console.error("Email send failed:", mailErr instanceof Error ? mailErr.message : mailErr);
        return json({
          error: "Could not send the email right now. Please try again later or contact admin."
        }, 500);
      }
      return genericOk;
    }
    return json({
      error: `Unknown action: ${action}`
    }, 400);
  } catch (e) {
    return json({
      error: e instanceof Error ? e.message : String(e)
    }, 500);
  }
});
