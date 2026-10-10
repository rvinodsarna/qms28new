/* logout-unmute.js v4 - plays unmuted, splash-style mute button */
(function () {
  "use strict";
  if (window.__logoutUnmuteV4) return;
  window.__logoutUnmuteV4 = true;

  function getVideo() { return document.getElementById("logout-video"); }
  function getOverlay() { return document.getElementById("logout-video-overlay"); }

  function ensureButton() {
    var overlay = getOverlay();
    var video = getVideo();
    if (!overlay || !video) return null;

    var existing = overlay.querySelector(".splash-unmute");
    if (existing) {
      existing.textContent = video.muted ? "Tap to unmute" : "Sound on";
      return existing;
    }

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "splash-unmute";
    btn.textContent = video.muted ? "Tap to unmute" : "Sound on";

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
      btn.textContent = v.muted ? "Tap to unmute" : "Sound on";
    });

    overlay.appendChild(btn);
    return btn;
  }

  function armVideo() {
    var v = getVideo();
    if (!v) return;
    v.muted = false;
    v.volume = 1;
  }

  function watch() {
    var overlay = getOverlay();
    if (!overlay) { setTimeout(watch, 500); return; }
    if (overlay.getAttribute("data-unmute-v4") === "1") return;
    overlay.setAttribute("data-unmute-v4", "1");

    var wasVisible = false;
    setInterval(function () {
      var cs = getComputedStyle(overlay);
      var visible = cs.display !== "none" && parseFloat(cs.opacity || "1") > 0;
      if (visible && !wasVisible) {
        wasVisible = true;
        armVideo();
        setTimeout(function () {
          ensureButton();
          var v = getVideo();
          if (v && v.paused && !v.ended) {
            v.muted = true;
            v.play().catch(function(){});
            var b = overlay.querySelector(".splash-unmute");
            if (b) b.textContent = "Tap to unmute";
          }
        }, 300);
      } else if (!visible && wasVisible) {
        wasVisible = false;
        var b = overlay.querySelector(".splash-unmute");
        if (b) b.remove();
        overlay.removeAttribute("data-unmute-v4");
      }
    }, 200);
  }

  function init() {
    try { localStorage.removeItem("qms.logoutVideo.muted"); } catch (e) {}
    watch();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  console.log("[logout-unmute] v4 ready - sound + splash-style button");
})();