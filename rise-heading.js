/* rise-heading.js — wrap RISE Categories grid in a proper glass panel with title */
(function () {
  if (window.__risePanel) return;
  window.__risePanel = true;

  function buildPanel() {
    var grid = document.querySelector(".sd-cats-grid");
    if (!grid) return false;
    if (grid.parentElement && grid.parentElement.classList && grid.parentElement.classList.contains("rise-categories-panel")) return true;

    // Remove old plain heading if it exists
    var oldH = document.querySelector(".qms-rise-h");
    if (oldH && oldH.parentElement) oldH.parentElement.removeChild(oldH);

    // Create the panel
    var panel = document.createElement("div");
    panel.className = "glass-card rise-categories-panel";
    panel.style.cssText =
      "margin-top:24px;padding:22px 22px 24px;border-radius:16px;" +
      "background:linear-gradient(160deg,rgba(12,16,32,0.55),rgba(8,10,24,0.65));" +
      "border:1px solid rgba(0,245,255,0.18);" +
      "box-shadow:0 8px 32px rgba(0,0,0,0.35),inset 0 1px 0 rgba(255,255,255,0.04);" +
      "position:relative;overflow:hidden;";

    // Decorative top accent
    var accent = document.createElement("div");
    accent.style.cssText =
      "position:absolute;top:0;left:0;right:0;height:2px;" +
      "background:linear-gradient(90deg,transparent,#00f5ff,#7c3aed,transparent);";
    panel.appendChild(accent);

    // Header row with title + subtitle
    var header = document.createElement("div");
    header.style.cssText =
      "display:flex;align-items:baseline;gap:12px;margin-bottom:18px;flex-wrap:wrap;";
    header.innerHTML =
      '<div style="font-size:16px;font-weight:800;letter-spacing:0.3px;background:linear-gradient(90deg,#00f5ff,#7c3aed);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;">RISE Categories</div>' +
      '<div style="font-size:11px;letter-spacing:1.5px;opacity:0.55;color:#8ab4c8;">YOUR ENGAGEMENT BREAKDOWN</div>';
    panel.appendChild(header);

    // Move the grid inside the panel
    var parent = grid.parentElement;
    parent.insertBefore(panel, grid);
    panel.appendChild(grid);

    console.log("[rise-panel] built");
    return true;
  }

  function boot() {
    if (!buildPanel()) {
      var n = 0;
      var iv = setInterval(function () {
        if (buildPanel() || ++n > 30) clearInterval(iv);
      }, 300);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  // Rebuild on navigation back to dashboard
  if (typeof window.navigate === "function" && !window.__risePanelNav) {
    var orig = window.navigate;
    window.navigate = function (r) {
      var x = orig.apply(this, arguments);
      if (r === "dashboard") setTimeout(boot, 700);
      return x;
    };
    window.__risePanelNav = true;
  }
})();
