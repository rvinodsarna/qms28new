/* gold-shimmer.js — force gold shimmer on QMS RISE v28.0 via inline styles.
   Inline styles + !important win against everything in the CSS cascade. */
(function () {
  if (window.__goldShimmerInstalled) return;
  window.__goldShimmerInstalled = true;

  var GRADIENT =
    "linear-gradient(90deg," +
    "#a16207 0%," +
    "#facc15 18%," +
    "#fff7c2 38%," +
    "#ffd700 50%," +
    "#fff7c2 62%," +
    "#facc15 82%," +
    "#a16207 100%)";

  var KEYFRAME_ID = "qms-gold-shimmer-keyframe";

  function ensureKeyframe() {
    if (document.getElementById(KEYFRAME_ID)) return;
    var s = document.createElement("style");
    s.id = KEYFRAME_ID;
    s.textContent =
      "@keyframes qmsGoldShimmerKf{" +
      "0%{background-position:0% 50%;}" +
      "100%{background-position:220% 50%;}}";
    document.head.appendChild(s);
  }

  function applyGold(el) {
    if (!el || el.dataset.goldApplied === "1") {
      // Re-apply in case something else reset it
    }
    el.dataset.goldApplied = "1";
    el.style.setProperty("background", GRADIENT, "important");
    el.style.setProperty("background-size", "220% auto", "important");
    el.style.setProperty("-webkit-background-clip", "text", "important");
    el.style.setProperty("background-clip", "text", "important");
    el.style.setProperty("-webkit-text-fill-color", "transparent", "important");
    el.style.setProperty("color", "transparent", "important");
    el.style.setProperty("font-weight", "700", "important");
    el.style.setProperty("letter-spacing", "1.5px", "important");
    el.style.setProperty("text-shadow", "0 0 10px rgba(255,200,60,0.45)", "important");
    el.style.setProperty("animation", "qmsGoldShimmerKf 3.2s linear infinite", "important");
    el.style.setProperty("will-change", "background-position", "important");
    el.style.setProperty("-webkit-text-stroke", "0", "important");
  }

  function findTargets() {
    var found = [];

    // Primary: by class
    document.querySelectorAll(".topbar-logo-sub").forEach(function (el) {
      found.push(el);
    });

    // Fallback: scan topbar for any element whose text matches "QMS RISE v..."
    var topbar = document.querySelector(".topbar-logo") ||
                 document.querySelector(".topbar");
    if (topbar) {
      topbar.querySelectorAll("div,span,small").forEach(function (el) {
        if (el.children.length > 0) return;
        var t = (el.textContent || "").trim();
        if (/^QMS\s*RISE\b/i.test(t) && !found.includes(el)) {
          found.push(el);
        }
      });
    }

    return found;
  }

  function run() {
    ensureKeyframe();
    var targets = findTargets();
    if (targets.length === 0) return false;
    targets.forEach(applyGold);
    return true;
  }

  // Run immediately and on retry
  function boot() {
    if (run()) return;
    var tries = 0;
    var iv = setInterval(function () {
      if (run() || ++tries > 100) clearInterval(iv);
    }, 200);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  // Re-apply whenever the topbar is re-rendered
  var obs = new MutationObserver(function () {
    // Debounced re-apply
    if (obs._t) return;
    obs._t = setTimeout(function () {
      obs._t = null;
      run();
    }, 80);
  });
  obs.observe(document.body, { childList: true, subtree: true });

  // Also re-apply on nav (topbar title may change)
  if (typeof window.navigate === "function" && !window.__goldShimmerNav) {
    var origNav = window.navigate;
    window.navigate = function () {
      var r = origNav.apply(this, arguments);
      setTimeout(run, 50);
      setTimeout(run, 300);
      return r;
    };
    window.__goldShimmerNav = true;
  }

  console.log("[gold-shimmer] installed");
})();