/* Unmute the logout video when the logout overlay opens */
(function () {
  "use strict";
  if (window.__logoutUnmute) return;
  window.__logoutUnmute = true;

  function wireLogoutVideo() {
    var overlay = document.getElementById("logout-video-overlay");
    var video = document.getElementById("logout-video");
    if (!overlay || !video) return;
    if (overlay.getAttribute("data-unmute-wired") === "1") return;

    overlay.setAttribute("data-unmute-wired", "1");

    // Watch for the overlay becoming visible
    var wasVisible = false;
    function check() {
      var visible = getComputedStyle(overlay).display !== "none"
                 && getComputedStyle(overlay).opacity !== "0";
      if (visible && !wasVisible) {
        wasVisible = true;
        // Unmute and set volume
        try {
          video.muted = false;
          video.volume = 1;
          // Some browsers block autoplay with sound unless a user gesture happened
          // Logout IS a click, so this should work
          var p = video.play();
          if (p && p.catch) {
            p.catch(function (err) {
              console.warn("[logout-unmute] autoplay with sound blocked, falling back to muted:", err.message);
              video.muted = true;
              video.play().catch(function(){});
            });
          }
          console.log("[logout-unmute] video unmuted and playing");
        } catch (e) {
          console.warn("[logout-unmute] failed:", e);
        }
      } else if (!visible && wasVisible) {
        wasVisible = false;
      }
    }

    // Check periodically + on DOM changes
    setInterval(check, 300);
    new MutationObserver(check).observe(overlay, { attributes: true, attributeFilter: ["style", "class"] });
    check();
  }

  function init() {
    wireLogoutVideo();
    new MutationObserver(function () {
      wireLogoutVideo();
    }).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  console.log("[logout-unmute] loaded");
})();