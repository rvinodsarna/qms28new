/* Add 3 more RISE categories to the dashboard grid */
(function () {
  "use strict";
  if (window.__dashExtras) return;
  window.__dashExtras = true;

  var EXTRAS = [
    { icon: "\uD83C\uDFC5", label: "Award & Recognition",     color: "#ffb800", route: "award-recognition" },
    { icon: "\uD83E\uDD1D", label: "Community Service",       color: "#00e5c0", route: null                },
    { icon: "\uD83D\uDCDA", label: "Research & Publications", color: "#a855f7", route: null                }
  ];

  function inject() {
    var u = window.QMS && QMS.state && QMS.state.user;
    if (!u || u.role !== "student") return;

    var grid = document.querySelector(".sd-cats-grid");
    if (!grid) return;

    // Already have all 3?
    if (grid.querySelectorAll("[data-extra-card]").length === 3) return;

    // Remove partial injections
    grid.querySelectorAll("[data-extra-card]").forEach(function (el) { el.remove(); });

    EXTRAS.forEach(function (ex) {
      var card = document.createElement("div");
      card.className = "sd-cat-card";
      card.setAttribute("data-extra-card", "1");
      card.style.setProperty("--cat-color", ex.color);
      card.style.cursor = "pointer";

      card.innerHTML =
        '<div class="sd-cat-top">' +
          '<span class="sd-cat-name">' +
            '<span class="sd-cat-icon-badge" style="font-size:16px;">' + ex.icon + '</span>' +
            ex.label +
          '</span>' +
          '<span class="sd-cat-pct">0.0%</span>' +
        '</div>' +
        '<div class="sd-cat-track"><div class="sd-cat-fill" style="width:0%"></div></div>' +
        '<div class="sd-cat-meta">Coming soon</div>';

      card.addEventListener("click", function () {
        if (ex.route && typeof window.navigate === "function") window.navigate(ex.route);
        else if (window.QMS && QMS.showToast) QMS.showToast(ex.label + " — coming soon", "info");
      });

      grid.appendChild(card);
    });
  }

  // Run on load + retry up to 20 times
  var tries = 0;
  function boot() {
    tries++;
    var grid = document.querySelector(".sd-cats-grid");
    if (!grid || grid.querySelectorAll(".sd-cat-card").length < 5) {
      if (tries < 20) setTimeout(boot, 300);
      return;
    }
    inject();
  }
  boot();

  // Re-run when navigating to dashboard
  if (typeof window.navigate === "function" && !window.__dashExtrasNav) {
    var orig = window.navigate;
    window.navigate = function (r) {
      var x = orig.apply(this, arguments);
      if (r === "dashboard") { tries = 0; setTimeout(boot, 400); }
      return x;
    };
    window.__dashExtrasNav = true;
  }
})();