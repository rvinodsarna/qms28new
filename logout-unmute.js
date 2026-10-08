/* logout-unmute.js — force logout video to play UNMUTED with a mute toggle button */
(function () {
  "use strict";
  if (window.__logoutUnmuteV2) return;
  window.__logoutUnmuteV2 = true;

  var PREF_KEY = "qms.logoutVideo.muted";

  function getPref() {
    try { return localStorage.getItem(PREF_KEY) === "1"; } catch (e) { return false; }
  }
  function setPref(muted) {
    try { localStorage.setItem(PREF_KEY, muted ? "1" : "0"); } catch (e) {}
  }

  function ensureMuteButton(video, overlay) {
    var existing = overlay.querySelector(".logout-mute-btn");
    if (existing) return existing;

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "logout-mute-btn";
    btn.style.cssText =
      "position:absolute;bottom:60px;left:50%;transform:translateX(-50%);" +
      "z-index:9999;padding:10px 22px;border-radius:999px;cursor:pointer;" +
      "background:rgba(0,0,0,0.65);color:#fff;border:1px solid rgba(255,255,255,0.35);" +
      "font-size:13px;font-weight:700;letter-spacing:1.5px;" +
      "backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);" +
      "display:flex;align-items:center;gap:8px;transition:all .2s;";

    function refresh() {
      var m = video.muted;
      btn.innerHTML = m ? "🔇 UNMUTE" : "🔊 MUTE";
      btn.style.background = m ? "rgba(0,0,0,0.75)" : "rgba(0,180,255,0.35)";
      btn.style.borderColor = m ? "rgba(255,255,255,0.35)" : "rgba(0,245,255,0.7)";
      btn.style.boxShadow = m ? "none" : "0 0 16px rgba(0,245,255,0.5)";
    }

    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      e.preventDefault();
      video.muted = !video.muted;
      if (!video.muted) video.volume = 1;
      setPref(video.muted);
      refresh();
      if (!video.muted) {
        try { video.play().catch(function(){}); } catch (err) {}
      }
    });

    overlay.appendChild(btn);
    refresh();
    return btn;
  }

  function forceUnmuted(video, overlay) {
    if (!video) return;

    // Respect a saved "muted" preference — otherwise default to unmuted
    var userMuted = getPref();

    // Override the app's fallback-to-muted behavior
    var attempts = 0;
    function tryUnmuted() {
      attempts++;
      video.muted = userMuted;
      if (!userMuted) video.volume = 1;
      var p = video.play();
      if (p && p.catch) {
        p.catch(function (err) {
          // If autoplay with sound is blocked AND user hasn't chosen muted,
          // stay muted for now but keep the button visible so they can unmute.
          if (!userMuted) {
            video.muted = true;
            setPref(true);
            video.play().catch(function(){});
          }
          var btn = overlay.querySelector(".logout-mute-btn");
          if (btn) btn.dispatchEvent(new Event("refresh"));
        });
      }
      var btn = ensureMuteButton(video, overlay);
      // Force refresh of button state
      setTimeout(function () {
        var inner = btn.innerHTML;
        btn.innerHTML = video.muted ? "🔇 UNMUTE" : "🔊 MUTE";
      }, 50);
    }

    // Retry a few times in case the app set muted after we did
    tryUnmuted();
    setTimeout(tryUnmuted, 100);
    setTimeout(tryUnmuted, 300);
    setTimeout(tryUnmuted, 700);
  }

  function wireOverlay() {
    var overlay = document.getElementById("logout-video-overlay");
    var video = document.getElementById("logout-video");
    if (!overlay || !video) return;
    if (overlay.getAttribute("data-unmute-v2") === "1") return;
    overlay.setAttribute("data-unmute-v2", "1");

    // Ensure the overlay is a positioning context for the button
    if (getComputedStyle(overlay).position === "static") {
      overlay.style.position = "relative";
    }

    var wasVisible = false;
    function check() {
      var cs = getComputedStyle(overlay);
      var visible = cs.display !== "none" && cs.visibility !== "hidden" && parseFloat(cs.opacity || "1") > 0;
      if (visible && !wasVisible) {
        wasVisible = true;
        forceUnmuted(video, overlay);
      } else if (!visible && wasVisible) {
        wasVisible = false;
        var btn = overlay.querySelector(".logout-mute-btn");
        if (btn) btn.remove();
        overlay.removeAttribute("data-unmute-v2");
      }
    }

    setInterval(check, 250);
    new MutationObserver(check).observe(overlay, { attributes: true, attributeFilter: ["style", "class"] });
    check();
  }

  function init() {
    wireOverlay();
    new MutationObserver(wireOverlay).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  console.log("[logout-unmute] v2 loaded — video will play unmuted with toggle button");
})();
