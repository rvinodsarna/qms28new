/* logout-unmute.js v3 — guaranteed sound + prominent toggle */
(function () {
  "use strict";
  if (window.__logoutUnmuteV3) return;
  window.__logoutUnmuteV3 = true;

  var PREF_KEY = "qms.logoutVideo.muted";

  function getVideo() { return document.getElementById("logout-video"); }
  function getOverlay() { return document.getElementById("logout-video-overlay"); }

  /* Pre-arm: video.muted=false BEFORE any click, so play() gets sound */
  function preArm() {
    var v = getVideo();
    if (!v) return;
    var saved = localStorage.getItem(PREF_KEY);
    if (saved === "1") {
      v.muted = true;
    } else {
      v.muted = false;
      v.volume = 1;
    }
  }

  /* Big mute button at the bottom of the video */
  function ensureButton() {
    var overlay = getOverlay();
    var video = getVideo();
    if (!overlay || !video) return null;

    var existing = overlay.querySelector(".logout-mute-btn");
    if (existing) {
      existing.textContent = video.muted ? "🔇 TAP TO UNMUTE" : "🔊 SOUND ON — TAP TO MUTE";
      return existing;
    }

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "logout-mute-btn";
    btn.style.cssText =
      "position:fixed;bottom:80px;left:50%;transform:translateX(-50%);" +
      "z-index:2147483647;padding:14px 32px;border-radius:999px;cursor:pointer;" +
      "background:linear-gradient(135deg,rgba(255,56,96,0.95),rgba(255,120,0,0.95));" +
      "color:#fff;border:2px solid rgba(255,255,255,0.7);" +
      "font-size:15px;font-weight:800;letter-spacing:1.5px;" +
      "box-shadow:0 8px 32px rgba(255,56,96,0.6),0 0 24px rgba(255,120,0,0.4);" +
      "display:flex;align-items:center;gap:10px;transition:all .2s;" +
      "font-family:system-ui,-apple-system,sans-serif;" +
      "animation:logoutBtnPulse 1.5s ease-in-out infinite;";

    var style = document.getElementById("logout-mute-style");
    if (!style) {
      style = document.createElement("style");
      style.id = "logout-mute-style";
      style.textContent =
        "@keyframes logoutBtnPulse{0%,100%{transform:translateX(-50%) scale(1);box-shadow:0 8px 32px rgba(255,56,96,0.6)}" +
        "50%{transform:translateX(-50%) scale(1.06);box-shadow:0 12px 40px rgba(255,56,96,0.85)}}";
      document.head.appendChild(style);
    }

    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      e.preventDefault();
      var v = getVideo();
      if (!v) return;
      v.muted = !v.muted;
      if (!v.muted) {
        v.volume = 1;
        try { v.play().catch(function(){}); } catch (err) {}
      }
      localStorage.setItem(PREF_KEY, v.muted ? "1" : "0");
      btn.textContent = v.muted ? "🔇 TAP TO UNMUTE" : "🔊 SOUND ON — TAP TO MUTE";
      btn.style.background = v.muted
        ? "linear-gradient(135deg,rgba(255,56,96,0.95),rgba(255,120,0,0.95))"
        : "linear-gradient(135deg,rgba(0,200,100,0.95),rgba(0,150,200,0.95))";
      console.log("[logout-unmute] toggled, muted=", v.muted);
    });

    overlay.appendChild(btn);
    return btn;
  }

  /* Override play() to force unmuted when preference allows */
  function patchPlay() {
    var v = getVideo();
    if (!v || v.__playPatched) return;
    v.__playPatched = true;
    var orig = v.play.bind(v);
    v.play = function () {
      var saved = localStorage.getItem(PREF_KEY);
      if (saved !== "1") {
        v.muted = false;
        v.volume = 1;
      }
      var p = orig();
      if (p && p.catch) {
        p.catch(function (err) {
          console.warn("[logout-unmute] play failed:", err.name, err.message);
          if (err.name === "NotAllowedError") {
            // Browser blocked unmuted autoplay — fall back to muted + show button
            v.muted = true;
            localStorage.setItem(PREF_KEY, "1");
            orig().catch(function(){});
          }
        });
      }
      return p;
    };
  }

  /* Hook logout buttons in capture phase — runs BEFORE app's handler */
  function hookLogoutButtons() {
    var sels = ['#logout-btn', '.logout-btn', '[data-action="logout"]', 'button[id*="logout" i]', 'a[id*="logout" i]'];
    sels.forEach(function (sel) {
      try {
        document.querySelectorAll(sel).forEach(function (btn) {
          if (btn.dataset.unmuteHook) return;
          btn.dataset.unmuteHook = "1";
          btn.addEventListener("click", preArm, true);
        });
      } catch (e) {}
    });
  }

  function watch() {
    var overlay = getOverlay();
    if (!overlay) return;
    if (overlay.getAttribute("data-unmute-v3") === "1") return;
    overlay.setAttribute("data-unmute-v3", "1");

    var wasVisible = false;
    setInterval(function () {
      var cs = getComputedStyle(overlay);
      var visible = cs.display !== "none" && parseFloat(cs.opacity || "1") > 0;
      if (visible && !wasVisible) {
        wasVisible = true;
        preArm();
        patchPlay();
        ensureButton();
        // Retry button injection a few times in case overlay rerenders
        setTimeout(ensureButton, 200);
        setTimeout(ensureButton, 600);
      } else if (!visible && wasVisible) {
        wasVisible = false;
        var btn = overlay.querySelector(".logout-mute-btn");
        if (btn) btn.remove();
        overlay.removeAttribute("data-unmute-v3");
      }
    }, 250);

    new MutationObserver(function () {
      var v = getVideo();
      if (v) { preArm(); patchPlay(); }
      if (getOverlay() && getOverlay().getAttribute("data-unmute-v3") === "1") {
        setTimeout(ensureButton, 100);
      }
    }).observe(document.body, { childList: true, subtree: true });
  }

  function init() {
    hookLogoutButtons();
    patchPlay();
    watch();
    setInterval(function () {
      hookLogoutButtons();
      patchPlay();
    }, 800);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  console.log("[logout-unmute] v3 ready — sound + prominent toggle");
})();
