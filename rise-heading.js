/* Insert RISE CATEGORIES heading once */
(function () {
  if (window.__riseH) return;
  window.__riseH = true;

  function place() {
    var grid = document.querySelector(".sd-cats-grid");
    if (!grid || !grid.parentElement) return false;
    if (grid.parentElement.querySelector(".qms-rise-h")) return true;
    var h = document.createElement("div");
    h.className = "qms-rise-h";
    h.textContent = "RISE Categories";
    grid.parentElement.insertBefore(h, grid);
    return true;
  }

  function boot() {
    if (!place()) {
      // Try a few times until the grid renders
      var n = 0;
      var iv = setInterval(function () {
        if (place() || ++n > 20) clearInterval(iv);
      }, 300);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();