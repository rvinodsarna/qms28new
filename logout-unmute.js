/* logout-unmute.js v5 - plays unmuted, splash-style mute button, never auto-mutes */
(function () {
  "use strict";
  if (window.__logoutUnmuteV5) return;
  window.__logoutUnmuteV5 = true;

  function getVideo() { return document.getElementById("logout-video"); }
  function getOverlay() { return document.getElementById("logout-video-overlay"); }

  function setLabel(btn, muted) {
    btn.textContent = muted ? "Tap to unmute" : "Sound on";
  }

  function ensureButton() {
    var overlay = getOverlay();
    var video = getVideo();
    if (!overlay || !video) return null;

    var existing = overlay.querySelector(".splash-unmute");
    if (existing) {
      setLabel(existing, video.muted);
      return existing;
    }

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "splash-unmute";
    setLabel(btn, video.muted);

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
      setLabel(btn, v.muted);
    });

    overlay.appendChild(btn);
    return btn;
  }

  function watch() {
    var overlay = getOverlay();
    if (!overlay) { setTimeout(watch, 500); return; }
    if (overlay.getAttribute("data-unmute-v5") === "1") return;
    overlay.setAttribute("data-unmute-v5", "1");

    var wasVisible = false;
    setInterval(function () {
      var cs = getComputedStyle(overlay);
      var visible = cs.display !== "none" && parseFloat(cs.opacity || "1") > 0;
      if (visible && !wasVisible) {
        wasVisible = true;
        var v = getVideo();
        if (v) {
          v.muted = false;
          v.volume = 1;
        }
        setTimeout(ensureButton, 200);
        setTimeout(function () {
          var b = overlay.querySelector(".splash-unmute");
          var vid = getVideo();
          if (b && vid) setLabel(b, vid.muted);
        }, 1500);
      } else if (!visible && wasVisible) {
        wasVisible = false;
        var b = overlay.querySelector(".splash-unmute");
        if (b) b.remove();
        overlay.removeAttribute("data-unmute-v5");
      }
    }, 200);
  }

  function init() {
    try { localStorage.removeItem("qms.logoutVideo.muted"); } catch (e) {}
    watch();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  console.log("[logout-unmute] v5 ready - never auto-mutes");
})();