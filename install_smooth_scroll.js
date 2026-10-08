const fs = require("fs");

/* ── 1. SMOOTH SCROLL CSS ── */
const css = `/* SMOOTH SCROLL EVERYWHERE — iOS-style inertial scrolling on all platforms */
html {
  scroll-behavior: smooth !important;
  -webkit-overflow-scrolling: touch !important;
  overscroll-behavior-y: none !important;
}
html, body {
  overflow-x: hidden !important;
  overflow-y: auto !important;
  height: auto !important;
  min-height: 100% !important;
  position: static !important;
  touch-action: pan-y !important;
  overscroll-behavior-y: auto !important;
}
#app, .app, .app-body, #main-content, .main-content, .content, .page-content {
  overflow-y: auto !important;
  overflow-x: hidden !important;
  -webkit-overflow-scrolling: touch !important;
  touch-action: pan-y !important;
  scroll-behavior: smooth !important;
}
.ai-chat-messages,
.sidebar, .sidebar-inner,
.modal, .modal-content, .modal-body,
.drawer, .drawer-content,
[role="dialog"] {
  -webkit-overflow-scrolling: touch !important;
  overscroll-behavior: contain !important;
  scroll-behavior: smooth !important;
}
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto !important; }
}
`;
fs.writeFileSync("styles-scroll-fix.css", css, "utf8");

/* ── 2. SMOOTH MOUSE-WHEEL SCROLL JS (like trackpad inertia) ── */
const js = `/* smooth-scroll.js — inertial mouse-wheel scrolling everywhere
 * Converts jerky mouse wheel to smooth animated scroll.
 * Leaves native trackpad/touch alone (they already feel right).
 */
(function () {
  "use strict";
  if (window.__smoothScroll) return;
  window.__smoothScroll = true;

  var current = 0;
  var target = 0;
  var raf = null;
  var EASE = 0.18;
  var WHEEL_SCALE = 1.0;
  var lastWheelTime = 0;

  function anim() {
    var diff = target - current;
    if (Math.abs(diff) < 0.5) {
      current = target;
      window.scrollTo(0, Math.round(current));
      raf = null;
      return;
    }
    current += diff * EASE;
    window.scrollTo(0, Math.round(current));
    raf = requestAnimationFrame(anim);
  }

  function onWheel(e) {
    if (e.ctrlKey) return;                     // pinch-zoom — leave alone
    if (e.shiftKey) return;                    // horizontal scroll — leave alone
    var el = e.target;
    // Let inner scrollers (chat, modals) handle their own wheel
    while (el && el !== document.body) {
      var cs = getComputedStyle(el);
      if ((cs.overflowY === "auto" || cs.overflowY === "scroll") && el.scrollHeight > el.clientHeight) {
        return;
      }
      el = el.parentElement;
    }
    e.preventDefault();

    var delta = e.deltaY * WHEEL_SCALE;

    // Trackpad gives many small deltas; mouse wheel gives chunky ones.
    var now = performance.now();
    var isTrackpad = now - lastWheelTime < 40 && Math.abs(delta) < 40;
    lastWheelTime = now;

    if (isTrackpad) {
      // Native feel for trackpad — direct scroll
      window.scrollBy(0, delta);
      current = window.scrollY;
      target = window.scrollY;
      return;
    }

    target = Math.max(0, Math.min(
      document.documentElement.scrollHeight - window.innerHeight,
      target + delta
    ));
    if (!raf) {
      current = window.scrollY;
      raf = requestAnimationFrame(anim);
    }
  }

  window.addEventListener("wheel", onWheel, { passive: false });

  // Keep our numbers in sync on native scroll
  window.addEventListener("scroll", function () {
    if (!raf) {
      current = window.scrollY;
      target = window.scrollY;
    }
  }, { passive: true });

  // Touch: leave to native (already smooth on iOS/Android)
  console.log("[smooth-scroll] active");
})();
`;
fs.writeFileSync("smooth-scroll.js", js, "utf8");

/* ── 3. Link both into index.html ── */
let html = fs.readFileSync("index.html", "utf8");

// bump scroll CSS version
html = html.replace(/styles-scroll-fix\.css\?v=\d+/g, "styles-scroll-fix.css?v=100");

// add smooth-scroll.js before </body> if missing
if (!html.includes("smooth-scroll.js")) {
  html = html.replace("</body>", '  <script src="smooth-scroll.js?v=1" defer></script>\n</body>');
  console.log("added smooth-scroll.js");
} else {
  html = html.replace(/smooth-scroll\.js\?v=\d+/g, "smooth-scroll.js?v=1");
  console.log("bumped smooth-scroll.js");
}

fs.writeFileSync("index.html", html, "utf8");

console.log("─".repeat(50));
console.log("styles-scroll-fix.css:", fs.statSync("styles-scroll-fix.css").size, "bytes");
console.log("smooth-scroll.js:", fs.statSync("smooth-scroll.js").size, "bytes");
console.log("index.html updated: true");
console.log("─".repeat(50));
