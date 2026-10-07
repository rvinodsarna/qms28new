/* Hides every dashboard card/hero on HOP dashboard except the SO-CSI panel */
(function () {
  "use strict";
  if (window.__hopCleanup) return;
  window.__hopCleanup = true;

  function hideExtras() {
    var u = window.QMS && QMS.state && QMS.state.user;
    if (!u || (u.role !== "hop" && u.role !== "dean" && u.role !== "admin")) return;
    var main = document.getElementById("main-content");
    var panel = document.querySelector("[data-hop-stats]");
    if (!main || !panel) return;

    var kids = main.children;
    for (var i = 0; i < kids.length; i++) {
      var k = kids[i];
      if (k === panel) continue;
      if (k.getAttribute("data-hop-hidden") === "1") continue;
      k.style.display = "none";
      k.setAttribute("data-hop-hidden", "1");
    }
  }

  setTimeout(hideExtras, 400);
  setTimeout(hideExtras, 1200);
  setTimeout(hideExtras, 2500);

  setInterval(hideExtras, 1000);

  if (typeof window.navigate === "function" && !window.__hopCleanupNav) {
    var orig = window.navigate;
    window.navigate = function (route) {
      var r = orig.apply(this, arguments);
      setTimeout(hideExtras, 500);
      setTimeout(hideExtras, 1200);
      setTimeout(hideExtras, 2000);
      return r;
    };
    window.__hopCleanupNav = true;
  }
})();