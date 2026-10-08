/* smooth-scroll.js — inertial mouse-wheel scrolling everywhere
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
