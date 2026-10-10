/* Add extra RISE categories to the dashboard grid */
(function () {
  "use strict";
  if (window.__dashExtras) return;
  window.__dashExtras = true;

  var EXTRAS = [
    { icon: "\uD83C\uDFDB", label: "Clubs & Roles",        color: "#00e5c0", route: "student-clubs"      },
    { icon: "\uD83C\uDFC5", label: "Award & Recognition",  color: "#ffb800", route: "award-recognition"  }
  ];

  function inject() {
    var u = window.QMS && QMS.state && QMS.state.user;
    if (!u || u.role !== "student") return;

    var grid = document.querySelector(".sd-cats-grid");
    if (!grid) return;

    // Remove partial injections from previous runs
    grid.querySelectorAll("[data-extra-card]").forEach(function (el) { el.remove(); });

    // Filter out any that already exist as native cards
    var existing = {};
    Array.from(grid.querySelectorAll(".sd-cat-name")).forEach(function (n) {
      var t = n.textContent.replace(/\s+/g, " ").trim().toLowerCase();
      existing[t] = 1;
    });

    var added = 0;
    EXTRAS.forEach(function (ex) {
      var key = ex.label.toLowerCase();
      if (existing[key]) return;

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
          '<span class="sd-cat-pct">—</span>' +
        '</div>' +
        '<div class="sd-cat-track"><div class="sd-cat-fill" style="width:0%"></div></div>' +
        '<div class="sd-cat-meta">Tap to view</div>';

      card.addEventListener("click", function () {
        if (ex.route && typeof window.navigate === "function") window.navigate(ex.route);
        else if (window.QMS && QMS.showToast) QMS.showToast(ex.label + " — coming soon", "info");
      });

      grid.appendChild(card);
      added++;
    });

    if (added > 0) console.log("[dash-extras] added", added, "extra categories");
  }

  var tries = 0;
  function boot() {
    tries++;
    var grid = document.querySelector(".sd-cats-grid");
    if (!grid || grid.querySelectorAll(".sd-cat-card").length < 5) {
      if (tries < 30) setTimeout(boot, 300);
      return;
    }
    inject();
  }
  boot();

  if (typeof window.navigate === "function" && !window.__dashExtrasNav) {
    var orig = window.navigate;
    window.navigate = function (r) {
      var x = orig.apply(this, arguments);
      if (r === "dashboard") { tries = 0; var __t=0; var __jv=setInterval(function(){ var __m=document.getElementById("main-content"); if(__m && __m.children.length>0 && !__m.querySelector(".loading-wrap")){ clearInterval(__jv); boot(); } if(++__t>40) clearInterval(__jv); }, 50); }
      return x;
    };
    window.__dashExtrasNav = true;
  }
})();