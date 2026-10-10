/* dash-drag.js v22 — drag and drop + max 10 + limit popup. No MutationObserver. */
(function () {
  "use strict";
  if (window.__ddv22) return;
  window.__ddv22 = true;

  var MAX_PINNED = 10;
  var LS = "qms.dd.v22";

  var FIXED = [
    { icon: "\uD83C\uDF93", code: "academic-support", route: "academic-support", cls: "qa-green",   display: "Academic Support" },
    { icon: "\uD83D\uDCC8", code: "my-progress",      route: "my-progress",      cls: "qa-magenta", display: "My Progress" },
    { icon: "\uD83D\uDCC5", code: "timetable",        route: "timetable",        cls: "qa-cyan",    display: "Timetable" },
    { icon: "\uD83D\uDCDA", code: "study-plan",       route: "study-plan",       cls: "qa-violet",  display: "Study Plan" }
  ];

  var CAT = {
    "Attendance":          { icon: "\uD83D\uDCC5", code: "attendance",        route: "qr-scanner",        cls: "qa-cyan",    display: "Attendance" },
    "Evaluation":          { icon: "\uD83D\uDCDD", code: "evaluation",        route: "evaluation",        cls: "qa-violet",  display: "Evaluation" },
    "Quiz Battle":         { icon: "\u26A1",       code: "quiz",              route: "quiz",              cls: "qa-magenta", display: "Quiz Battle" },
    "Bonus":               { icon: "\uD83C\uDFAF", code: "bonus",             route: "bonus",             cls: "qa-gold",    display: "Bonus" },
    "Clubs & Roles":       { icon: "\uD83C\uDFDB", code: "positions",         route: "student-clubs",     cls: "qa-green",   display: "Clubs & Roles" },
    "Streak":              { icon: "\uD83D\uDD25", code: "streak",            route: "my-progress",       cls: "qa-magenta", display: "Streak" },
    "Workshops & Talks":   { icon: "\uD83C\uDF93", code: "workshops",         route: "events",            cls: "qa-violet",  display: "Workshops & Talks" },
    "Competitions":        { icon: "\uD83C\uDFC6", code: "competitions",      route: "events",            cls: "qa-green",   display: "Competitions" },
    "Coursera":            { icon: "\uD83D\uDCD8", code: "coursera",          route: "certificates",      cls: "qa-cyan",    display: "Coursera" },
    "Award & Recognition": { icon: "\uD83C\uDFC5", code: "award_recognition", route: "award-recognition", cls: "qa-gold",    display: "Award & Recognition" }
  };

  var layout = { pinned: [] };
  var editMode = false;
  var isRendering = false;
  var intervals = [];

  function load() {
    try { return JSON.parse(localStorage.getItem(LS) || "{}") || {}; }
    catch (e) { return {}; }
  }
  function save() {
    try { localStorage.setItem(LS, JSON.stringify(layout)); } catch (e) {}
  }
  function findMeta(c) {
    for (var k in CAT) if (CAT[k].code === c) return CAT[k];
    return null;
  }
  function catLabel(el) {
    var n = el.querySelector(".sd-cat-name");
    if (!n) return "";
    var c = n.cloneNode(true);
    var b = c.querySelector(".sd-cat-icon-badge");
    if (b) b.remove();
    return c.textContent.replace(/\s+/g, " ").trim();
  }
  function isFixed(c) {
    return FIXED.some(function (m) { return m.code === c; });
  }

  /* ---------- QMS-styled popup (single OK button) ---------- */
  function qmsAlert(title, message) {
    var old = document.getElementById("qms-alert-modal");
    if (old) old.remove();

    var ov = document.createElement("div");
    ov.id = "qms-alert-modal";
    ov.style.cssText =
      "position:fixed;inset:0;z-index:2147483647;" +
      "background:rgba(6,8,16,0.82);" +
      "backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);" +
      "display:flex;align-items:center;justify-content:center;" +
      "animation:qmsFadeIn 0.2s ease;";

    var icon = title.toLowerCase().indexOf("full") >= 0 ? "\uD83D\uDD12" : "\u26A0\uFE0F";
    var accentA = title.toLowerCase().indexOf("full") >= 0 ? "#ff3860" : "#00f5ff";
    var accentB = title.toLowerCase().indexOf("full") >= 0 ? "#ff6b35" : "#7c3aed";

    ov.innerHTML =
      '<div style="width:90%;max-width:440px;padding:30px 28px 24px;' +
        'background:linear-gradient(160deg,rgba(12,16,32,0.98),rgba(8,10,24,0.99));' +
        'border:1px solid ' + accentA + '66;border-radius:20px;' +
        'box-shadow:0 24px 80px rgba(0,0,0,0.75),0 0 40px ' + accentA + '44;' +
        'color:#eafcff;font-family:system-ui,-apple-system,sans-serif;' +
        'animation:qmsSlideUp 0.32s cubic-bezier(0.34,1.56,0.64,1);">' +
        '<div style="display:flex;align-items:center;gap:16px;margin-bottom:16px;">' +
          '<div style="width:52px;height:52px;border-radius:14px;' +
            'background:linear-gradient(135deg,' + accentA + '33,' + accentB + '33);' +
            'border:1px solid ' + accentA + '88;' +
            'display:flex;align-items:center;justify-content:center;' +
            'font-size:24px;flex-shrink:0;' +
            'box-shadow:0 0 22px ' + accentA + '55;">' + icon + '</div>' +
          '<div style="flex:1;">' +
            '<div style="font-size:17px;font-weight:800;letter-spacing:0.3px;' +
              'background:linear-gradient(90deg,' + accentA + ',' + accentB + ');' +
              '-webkit-background-clip:text;background-clip:text;' +
              '-webkit-text-fill-color:transparent;">' + title + '</div>' +
            '<div style="font-size:10.5px;letter-spacing:1.8px;opacity:0.6;margin-top:4px;color:' + accentA + ';">QMS RISE \u2014 NOTICE</div>' +
          '</div>' +
        '</div>' +
        '<div style="font-size:13.5px;line-height:1.65;opacity:0.88;margin-bottom:24px;padding-left:2px;color:#c8e8f0;">' + message + '</div>' +
        '<div style="display:flex;justify-content:flex-end;">' +
          '<button id="qms-alert-ok" style="padding:11px 30px;border-radius:10px;' +
            'background:linear-gradient(135deg,' + accentA + ',' + accentB + ');' +
            'color:#001a1f;border:none;font-size:12px;font-weight:800;letter-spacing:1.5px;' +
            'cursor:pointer;box-shadow:0 0 22px ' + accentA + '88;transition:all .18s;">OK, GOT IT</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(ov);

    if (!document.getElementById("qms-modal-anim")) {
      var st = document.createElement("style");
      st.id = "qms-modal-anim";
      st.textContent =
        "@keyframes qmsFadeIn{from{opacity:0}to{opacity:1}}" +
        "@keyframes qmsSlideUp{from{opacity:0;transform:translateY(20px) scale(0.95)}to{opacity:1;transform:translateY(0) scale(1)}}";
      document.head.appendChild(st);
    }

    function close() { ov.remove(); }
    ov.querySelector("#qms-alert-ok").onclick = close;
    ov.onclick = function (e) { if (e.target === ov) close(); };
    document.addEventListener("keydown", function esc(e) {
      if (e.key === "Escape") { close(); document.removeEventListener("keydown", esc); }
    });
  }

  /* ---------- QMS-styled confirm popup (CANCEL + CONFIRM) ---------- */
  function qmsConfirm(name, cb) {
    var old = document.getElementById("qms-confirm-modal");
    if (old) old.remove();

    var ov = document.createElement("div");
    ov.id = "qms-confirm-modal";
    ov.style.cssText =
      "position:fixed;inset:0;z-index:2147483647;" +
      "background:rgba(6,8,16,0.82);" +
      "backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);" +
      "display:flex;align-items:center;justify-content:center;" +
      "animation:qmsFadeIn 0.2s ease;";

    ov.innerHTML =
      '<div style="width:90%;max-width:440px;padding:30px 28px 24px;' +
        'background:linear-gradient(160deg,rgba(12,16,32,0.98),rgba(8,10,24,0.99));' +
        'border:1px solid rgba(0,245,255,0.4);border-radius:20px;' +
        'box-shadow:0 24px 80px rgba(0,0,0,0.75),0 0 40px rgba(0,245,255,0.22);' +
        'color:#eafcff;font-family:system-ui,-apple-system,sans-serif;' +
        'animation:qmsSlideUp 0.32s cubic-bezier(0.34,1.56,0.64,1);">' +
        '<div style="display:flex;align-items:center;gap:16px;margin-bottom:16px;">' +
          '<div style="width:52px;height:52px;border-radius:14px;' +
            'background:linear-gradient(135deg,rgba(0,245,255,0.22),rgba(124,58,237,0.22));' +
            'border:1px solid rgba(0,245,255,0.6);' +
            'display:flex;align-items:center;justify-content:center;' +
            'font-size:24px;flex-shrink:0;box-shadow:0 0 22px rgba(0,245,255,0.35);">\u2139\uFE0F</div>' +
          '<div style="flex:1;">' +
            '<div style="font-size:17px;font-weight:800;letter-spacing:0.3px;' +
              'background:linear-gradient(90deg,#00f5ff,#7c3aed);' +
              '-webkit-background-clip:text;background-clip:text;' +
              '-webkit-text-fill-color:transparent;">Remove from Quick Actions?</div>' +
            '<div style="font-size:10.5px;letter-spacing:1.8px;opacity:0.6;margin-top:4px;color:#00f5ff;">QMS RISE \u2014 CONFIRM</div>' +
          '</div>' +
        '</div>' +
        '<div style="font-size:13.5px;line-height:1.65;opacity:0.88;margin-bottom:24px;padding-left:2px;color:#c8e8f0;">' +
          'Remove <strong style="color:#00f5ff;">' + name + '</strong> from Quick Actions?' +
        '</div>' +
        '<div style="display:flex;gap:10px;justify-content:flex-end;">' +
          '<button id="qms-cancel" style="padding:11px 24px;border-radius:10px;' +
            'background:rgba(255,255,255,0.05);color:#b6d8e0;' +
            'border:1px solid rgba(255,255,255,0.2);font-size:12px;font-weight:700;' +
            'letter-spacing:1.2px;cursor:pointer;">CANCEL</button>' +
          '<button id="qms-remove" style="padding:11px 24px;border-radius:10px;' +
            'background:linear-gradient(135deg,#00f5ff,#7c3aed);color:#001a1f;' +
            'border:none;font-size:12px;font-weight:800;letter-spacing:1.2px;' +
            'cursor:pointer;box-shadow:0 0 22px rgba(0,245,255,0.55);">CONFIRM</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(ov);
    function close() { ov.remove(); }
    ov.querySelector("#qms-cancel").onclick = close;
    ov.onclick = function (e) { if (e.target === ov) close(); };
    document.addEventListener("keydown", function esc(e) {
      if (e.key === "Escape") { close(); document.removeEventListener("keydown", esc); }
    });
    ov.querySelector("#qms-remove").onclick = function () { close(); cb(); };
  }

  /* ---------- render ---------- */
  function rerender() {
    if (isRendering) return;
    var qa = document.querySelector(".sd-qa-grid");
    if (!qa) return;
    isRendering = true;
    try {
      qa.innerHTML = "";

      FIXED.forEach(function (m) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "sd-qa-tile " + m.cls;
        b.setAttribute("data-fixed", "1");
        b.setAttribute("data-cat-code", m.code);
        b.style.position = "relative";
        b.innerHTML =
          '<span class="sd-qa-icon-badge" style="font-size:20px;">' + m.icon + '</span>' +
          '<span class="qa-label">' + m.display + '</span>';
        b.onclick = function (e) {
          if (editMode) { e.preventDefault(); return; }
          if (m.route && typeof window.navigate === "function") window.navigate(m.route);
        };
        qa.appendChild(b);
      });

      layout.pinned.forEach(function (code) {
        if (isFixed(code)) return;
        var m = findMeta(code);
        if (!m) return;
        var b = document.createElement("button");
        b.type = "button";
        b.className = "sd-qa-tile " + m.cls;
        b.setAttribute("data-pinned", "1");
        b.setAttribute("data-cat-code", code);
        b.style.position = "relative";
        b.innerHTML =
          '<span class="qa-x" title="Remove">\u00D7</span>' +
          '<span class="sd-qa-icon-badge" style="font-size:20px;">' + m.icon + '</span>' +
          '<span class="qa-label">' + m.display + '</span>';
        b.querySelector(".qa-x").onclick = function (e) {
          e.preventDefault(); e.stopPropagation();
          if (!editMode) return;
          qmsConfirm(m.display, function () {
            layout.pinned = layout.pinned.filter(function (c) { return c !== code; });
            save();
            rerender();
          });
        };
        b.onclick = function (e) {
          if (editMode) { e.preventDefault(); return; }
          if (m.route && typeof window.navigate === "function") window.navigate(m.route);
        };
        qa.appendChild(b);
      });

      qa.setAttribute("data-edit-mode", editMode ? "1" : "0");
      qa.setAttribute("data-pinned-count", String(layout.pinned.filter(function (c) { return !isFixed(c); }).length));
      qa.setAttribute("data-max-pinned", String(MAX_PINNED));
    } finally {
      isRendering = false;
    }
  }

  /* ---------- edit button ---------- */
  function injectEditBtn() {
    var qa = document.querySelector(".sd-qa-grid");
    if (!qa) return;
    var card = qa.closest(".glass-card") || qa.parentElement;
    if (!card) return;
    var header = card.querySelector(".card-header");
    if (!header) return;
    if (header.querySelector(".qa-edit-btn")) return;
    header.style.display = "flex";
    header.style.justifyContent = "space-between";
    header.style.alignItems = "center";
    var b = document.createElement("button");
    b.type = "button";
    b.className = "qa-edit-btn";
    b.textContent = editMode ? "Done \u2713" : "Edit";
    b.style.cssText =
      "padding:6px 16px;font-size:11px;letter-spacing:1.5px;font-weight:800;" +
      "background:rgba(0,245,255,0.08);color:#00f5ff;" +
      "border:1px solid rgba(0,245,255,0.6);border-radius:8px;" +
      "cursor:pointer;margin-left:auto;transition:all 0.2s;";
    b.onclick = function () { toggleEdit(!editMode); };
    header.appendChild(b);
  }

  function toggleEdit(on) {
    editMode = !!on;
    var btn = document.querySelector(".qa-edit-btn");
    if (btn) {
      btn.textContent = editMode ? "Done \u2713" : "Edit";
      btn.style.background = editMode ? "rgba(0,245,255,0.28)" : "rgba(0,245,255,0.08)";
      btn.style.color = editMode ? "#001a1f" : "#00f5ff";
      btn.style.boxShadow = editMode ? "0 0 16px rgba(0,245,255,0.7)" : "none";
    }
    var qa = document.querySelector(".sd-qa-grid");
    if (qa) qa.setAttribute("data-edit-mode", editMode ? "1" : "0");
    document.querySelectorAll(".sd-qa-tile .qa-x").forEach(function (x) {
      x.style.display = editMode ? "flex" : "none";
    });
    if (!editMode) save();
  }

  /* ---------- styles ---------- */
  function injectStyles() {
    if (document.getElementById("dash-drag-styles")) return;
    var s = document.createElement("style");
    s.id = "dash-drag-styles";
    s.textContent = [
      ".sd-qa-tile{position:relative !important;cursor:grab !important;transition:transform .15s,box-shadow .2s}",
      ".sd-qa-tile:active{cursor:grabbing !important}",
      ".sd-qa-tile:hover{box-shadow:0 0 0 1px rgba(0,245,255,0.5),0 8px 24px rgba(0,245,255,0.28) !important;transform:translateY(-2px) !important}",
      ".qa-x{display:none;position:absolute;top:-8px;right:-8px;width:26px;height:26px;border-radius:50%;background:#ff3860;border:2px solid #0a0e1a;color:#fff;font-size:16px;font-weight:900;line-height:1;align-items:center;justify-content:center;cursor:pointer;z-index:999;padding:0;box-shadow:0 0 14px rgba(255,56,96,0.85);}",
      ".qa-x:hover{transform:scale(1.2)}",
      ".sd-qa-grid[data-edit-mode='1'] .sd-qa-tile[data-pinned='1'] .qa-x{display:flex !important}",
      ".sd-qa-grid[data-edit-mode='1'] .sd-qa-tile[data-pinned='1']{box-shadow:0 0 0 2px rgba(255,56,96,0.65) !important}",
      ".sd-cat-ghost,.sd-qa-ghost{opacity:0.3 !important;border:1px dashed rgba(0,245,255,0.7) !important}",
      ".sd-cat-chosen,.sd-qa-chosen{box-shadow:0 0 0 2px rgba(0,245,255,0.75) !important;transform:scale(1.05) !important}",
      ".sd-qa-grid[data-pinned-count]::after{content:attr(data-pinned-count) ' / ' attr(data-max-pinned) ' pinned';display:block;text-align:right;font-size:10px;letter-spacing:1.5px;opacity:0.5;margin-top:8px;grid-column:1 / -1}"
    ].join("\n");
    document.head.appendChild(s);
  }

  /* ---------- sortable ---------- */
  function attachSortable() {
    if (typeof Sortable === "undefined") return;
    var cats = document.querySelector(".sd-cats-grid");
    var qa = document.querySelector(".sd-qa-grid");
    if (!cats || !qa) return;

    if (!cats.dataset.sA) {
      Sortable.create(cats, {
        animation: 180,
        delay: 100,
        delayOnTouchOnly: true,
        ghostClass: "sd-cat-ghost",
        chosenClass: "sd-cat-chosen",
        group: { name: "dash", pull: "clone", put: false }
      });
      cats.dataset.sA = "1";
    }

    if (!qa.dataset.sA) {
      Sortable.create(qa, {
        animation: 180,
        delay: 100,
        delayOnTouchOnly: true,
        ghostClass: "sd-qa-ghost",
        chosenClass: "sd-qa-chosen",
        group: { name: "dash", pull: false, put: true },
        onAdd: function (evt) {
          var label = catLabel(evt.clone || evt.item);
          var meta = CAT[label];
          var item = evt.item;
          if (!meta) { item.remove(); return; }

          if (isFixed(meta.code)) {
            item.remove();
            qmsAlert("Already Fixed",
              "<strong>" + meta.display + "</strong> is a permanent Quick Action. It cannot be added again.");
            return;
          }
          if (layout.pinned.indexOf(meta.code) !== -1) {
            item.remove();
            qmsAlert("Already Pinned",
              "<strong>" + meta.display + "</strong> is already in your Quick Actions.");
            return;
          }

          var userCount = layout.pinned.filter(function (c) { return !isFixed(c); }).length;
          if (userCount >= MAX_PINNED) {
            item.remove();
            qmsAlert("Quick Actions Full",
              "You have reached the maximum of <strong style='color:#ff3860;'>" + MAX_PINNED + " custom shortcuts</strong>. " +
              "Remove one (click <strong style='color:#ff3860;'>Edit</strong> \u2192 tap the red <strong>\u00D7</strong>) before adding more.");
            return;
          }

          layout.pinned.push(meta.code);
          save();
          item.remove();
          rerender();
        }
      });
      qa.dataset.sA = "1";
    }
  }

  function attach() {
    var u = window.QMS && window.QMS.state && window.QMS.state.user;
    if (!u || u.role !== "student") return;
    var qa = document.querySelector(".sd-qa-grid");
    var cats = document.querySelector(".sd-cats-grid");
    if (!qa || !cats) return;
    document.body.setAttribute("data-drag-ready", "1");
    injectStyles();
    injectEditBtn();
    rerender();
    attachSortable();
  }

  /* ---------- boot: bounded polling only, no MutationObserver ---------- */
  function boot() {
    layout = load();
    if (!layout.pinned) layout.pinned = [];

    var ticks = 0;
    var iv = setInterval(function () {
      attach();
      ticks++;
      if (ticks > 40) { clearInterval(iv); }  /* stop after ~20 seconds */
    }, 500);
    intervals.push(iv);

    /* also stop all intervals when the page hides to prevent background loops */
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        intervals.forEach(function (x) { clearInterval(x); });
        intervals = [];
      }
    });
  }

  /* ---------- hook navigate (only one wrapper, tagged) ---------- */
  if (typeof window.navigate === "function" && !window.__ddv22Nav) {
    var orig = window.navigate;
    window.navigate = function (r) {
      var x = orig.apply(this, arguments);
      if (r === "dashboard" || r === "student-dashboard") {
        document.querySelectorAll(".sd-qa-grid").forEach(function (g) {
          g.dataset.sA = "";
          g.removeAttribute("data-sortable-attached");
        });
        var __t = 0;
        var jv = setInterval(function () {
          var __m = document.getElementById("main-content");
          if (__m && __m.children.length > 0 && !__m.querySelector(".loading-wrap")) {
            clearInterval(jv);
            attach();
          }
          if (++__t > 60) clearInterval(jv);
        }, 50);
      }
      return x;
    };
    window.__ddv22Nav = true;
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  console.log("[dash-drag] v22 ready (max " + MAX_PINNED + ")");
})();