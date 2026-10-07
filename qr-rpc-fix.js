// qr-rpc-fix.js — overrides window.submitQRCode to use the safe RPC
(function () {
  if (!window.QMS || !window.qmsSupabase) {
    console.warn('[qr-fix] QMS not ready; skipping');
    return;
  }

  window.submitQRCode = async function () {
    const input = document.getElementById("qr-code-input");
    const resultEl = document.getElementById("qr-result");
    const code = (input && input.value || "").trim().toUpperCase();
    if (!code) { window.QMS.showToast("Please enter a code", "error"); return; }

    const user = window.QMS.state && window.QMS.state.user;
    if (!user || !user.id) { window.QMS.showToast("Please sign in again", "error"); return; }

    if (resultEl) resultEl.innerHTML = '<div class="text-muted text-sm">Checking in...</div>';

    try {
      const { data, error } = await window.qmsSupabase.rpc("check_in_attendance", {
        p_code: code,
        p_student_name: user.name || user.email || "Student"
      });

      if (error) {
        window.QMS.showToast("Error: " + error.message, "error");
        if (resultEl) resultEl.innerHTML = "";
        return;
      }
      if (!data || !data.ok) {
        window.QMS.showToast((data && data.error) || "Check-in failed", "error");
        if (resultEl) resultEl.innerHTML = "";
        return;
      }

      if (input) input.value = "";
      if (resultEl) {
        resultEl.innerHTML =
          '<div class="alert alert-success"><span>OK</span><div><strong>Marked!</strong><br/>+' +
          data.pts + " RISE points - " + (data.subject || "") + "</div></div>";
      }
      window.QMS.showToast("Attendance recorded! +" + data.pts + " pts", "success");

      if (typeof window.__cleanupActiveScanner === "function") window.__cleanupActiveScanner();
      setTimeout(function () {
        if (typeof window.mountQRScanner === "function") window.mountQRScanner();
      }, 2000);
    } catch (err) {
      console.error("[qr-fix] error:", err);
      window.QMS.showToast("Unexpected error during check-in", "error");
      if (resultEl) resultEl.innerHTML = "";
    }
  };

  console.log('[qr-fix] override installed');
})();
