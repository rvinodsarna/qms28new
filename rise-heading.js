/* rise-heading.js — wraps the RISE Categories grid in a titled panel.
   Self-contained. Flash-free. Auto-retries on late dashboard render. */
(function () {
  if (window.__riseHeadingLoaded) return;
  window.__riseHeadingLoaded = true;

  function buildPanel() {
    var grid = document.querySelector(".sd-cats-grid");
    if (!grid) return false;
    if (document.querySelector(".rise-categories-panel")) return true;

    // Remove any leftover plain heading
    var old = document.querySelector(".qms-rise-h");
    if (old && old.parentElement) old.parentElement.removeChild(old);

    var panel = document.createElement("div");
    panel.className = "glass-card rise-categories-panel";
    panel.style.cssText =
      "margin-top:24px;padding:22px 22px 24px;border-radius:16px;" +
      "background:linear-gradient(160deg,rgba(12,16,32,0.55),rgba(8,10,24,0.65));" +
      "border:1px solid rgba(0,245,255,0.18);" +
      "box-shadow:0 8px 32px rgba(0,0,0,0.35),inset 0 1px 0 rgba(255,255,255,0.04);" +
      "position:relative;overflow:hidden;";

    var accent = document.createElement("div");
    accent.style.cssText =
      "position:absolute;top:0;left:0;right:0;height:2px;" +
      "background:linear-gradient(90deg,transparent,#00f5ff,#7c3aed,transparent);";
    panel.appendChild(accent);

    var header = document.createElement("div");
    header.style.cssText =
      "display:flex;align-items:baseline;gap:12px;margin-bottom:18px;flex-wrap:wrap;";
    header.innerHTML =
      '<div style="font-size:16px;font-weight:800;letter-spacing:0.3px;background:linear-gradient(90deg,#00f5ff,#7c3aed);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;">RISE Categories</div>' +
      '<div style="font-size:11px;letter-spacing:1.5px;opacity:0.55;color:#8ab4c8;">YOUR ENGAGEMENT BREAKDOWN</div>';
    panel.appendChild(header);

    var parent = grid.parentElement;
    if (!parent) return false;
    grid.style.visibility = "hidden";
    parent.insertBefore(panel, grid);
    panel.appendChild(grid);
    requestAnimationFrame(function () { grid.style.visibility = ""; });
    console.log("[rise-heading] panel built");
    return true;
  }

  function boot() {
    if (buildPanel()) return;
    var n = 0;
    var iv = setInterval(function () {
      if (buildPanel() || ++n > 100) clearInterval(iv);
    }, 200);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  // Rebuild when navigating back to dashboard
  if (typeof window.navigate === "function" && !window.__riseHeadingNav) {
    var orig = window.navigate;
    window.navigate = function (r) {
      var x = orig.apply(this, arguments);
      if (r === "dashboard") setTimeout(boot, 400);
      return x;
    };
    window.__riseHeadingNav = true;
  }
})();