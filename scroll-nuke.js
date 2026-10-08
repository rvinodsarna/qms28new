/* scroll-nuke.js — force scroll to work, period. */
(function () {
  "use strict";

  function forceScrollable() {
    try {
      document.documentElement.style.setProperty("overflow-y", "auto", "important");
      document.documentElement.style.setProperty("overflow-x", "hidden", "important");
      document.documentElement.style.setProperty("height", "auto", "important");
      document.documentElement.style.setProperty("position", "static", "important");
      document.body.style.setProperty("overflow-y", "auto", "important");
      document.body.style.setProperty("overflow-x", "hidden", "important");
      document.body.style.setProperty("height", "auto", "important");
      document.body.style.setProperty("position", "static", "important");
      document.body.style.setProperty("touch-action", "pan-y", "important");
      document.documentElement.style.setProperty("touch-action", "pan-y", "important");
    } catch (e) {}
  }

  // Run immediately and keep enforcing
  forceScrollable();
  setInterval(forceScrollable, 500);

  // On wheel — if the browser didn't scroll, do it manually
  window.addEventListener("wheel", function (e) {
    if (e.ctrlKey) return;
    var y = window.scrollY;
    var max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    if (y <= 0 && e.deltaY < 0) return;
    if (y >= max && e.deltaY > 0) return;

    // Check if browser scrolled natively — if not, force it
    setTimeout(function () {
      if (Math.abs(window.scrollY - y) < 1) {
        window.scrollTo(0, Math.max(0, Math.min(max, y + e.deltaY)));
      }
    }, 0);
  }, { passive: true });

  // On touch — if the browser didn't scroll, force it (fallback)
  var lastY = 0;
  document.addEventListener("touchstart", function (e) {
    if (e.touches.length === 1) lastY = e.touches[0].clientY;
  }, { passive: true });
  document.addEventListener("touchmove", function (e) {
    if (e.touches.length !== 1) return;
    var cur = e.touches[0].clientY;
    var delta = lastY - cur;
    lastY = cur;
    var y = window.scrollY;
    var max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    setTimeout(function () {
      if (Math.abs(window.scrollY - y) < 1) {
        window.scrollTo(0, Math.max(0, Math.min(max, y + delta)));
      }
    }, 0);
  }, { passive: true });

  console.log("[scroll-nuke] active — scroll should work everywhere");
})();
