/* dash-drag.js v20 — safe, no loops, with edit + drag + QMS modal */
(function () {
  "use strict";
  if (window.__dashDragV20) return;
  window.__dashDragV20 = true;

  var MAX_PINNED = 10;
  var LS_KEY = "qms.dashOrder.v1";
  var TABLE = "user_dashboard_layout";
  var layout = { pinned: [] };
  var hydrated = false;
  var currentUserId = null;
  var saveTimer = null;
  var editMode = false;
  var isRendering = false;
  var lastHash = "";

  var FIXED_TILES = [
    { icon: "\uD83C\uDF93", code: "academic-support", route: "academic-support", cls: "qa-green",   display: "Academic Support" },
    { icon: "\uD83D\uDCC8", code: "my-progress",      route: "my-progress",      cls: "qa-magenta", display: "My Progress" },
    { icon: "\uD83D\uDCC5", code: "timetable",        route: "timetable",        cls: "qa-cyan",    display: "Timetable" },
    { icon: "\uD83D\uDCDA", code: "study-plan",       route: "study-plan",       cls: "qa-violet",  display: "Study Plan" }
  ];

  var CAT_META = {
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

  function catLabel(card) {
    var n = card.querySelector(".sd-cat-name");
    if (!n) return "";
    var clone = n.cloneNode(true);
    var b = clone.querySelector(".sd-cat-icon-badge");
    if (b) b.remove();
    return clone.textContent.replace(/\s+/g, " ").trim();
  }
  function metaByCode(c) {
    for (var k in CAT_META) if (CAT_META[k].code === c) return CAT_META[k];
    return null;
  }
  function lsLoad() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}") || {}; }
    catch (e) { return {}; }
  }
  function lsSave() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(layout)); } catch (e) {}
  }

  async function hydrate() {
    if (hydrated) return; hydrated = true;
    layout = Object.assign(layout, lsLoad());
    if (!layout.pinned) layout.pinned = [];
    var sb = window.qmsSupabase;
    if (!sb) return;
    try {
      var sess = await sb.auth.getSession();
      currentUserId = sess && sess.data && sess.data.session && sess.data.session.user && sess.data.session.user.id;
      if (!currentUserId) return;
      var r = await sb.from(TABLE).select("layout").eq("user_id", currentUserId).maybeSingle();
      if (r.error) return;
      if (r.data && r.data.layout && typeof r.data.layout === "object") {
        layout = Object.assign(layout, r.data.layout);
        if (!layout.pinned) layout.pinned = [];
        lsSave();
      }
    } catch (e) {}
  }

  async function save() {
    lsSave();
    var sb = window.qmsSupabase;
    if (!sb || !currentUserId) return;
    try {
      await sb.from(TABLE).upsert({
        user_id: currentUserId, layout: layout, updated_at: new Date().toISOString()
      }, { onConflict: "user_id" });
    } catch (e) {}
  }
  function scheduleSave() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 600);
  }

  function isPinned(c) { return layout.pinned.indexOf(c) !== -1; }
  function pin(c) {
    if (FIXED_TILES.some(function (m) { return m.code === c; })) return false;
    if (isPinned(c)) return false;
    if (layout.pinned.length >= MAX_PINNED) {
      window.QMS && QMS.showToast && QMS.showToast("Max " + MAX_PINNED + " pinned", "warning");
      return false;
    }
    layout.pinned.push(c);
    scheduleSave();
    return true;
  }
  function unpin(c) {
    var i = layout.pinned.indexOf(c);
    if (i === -1) return false;
    layout.pinned.splice(i, 1);
    scheduleSave();
    return true;
  }

  function qmsConfirm(name, onOk) {
    var old = document.getElementById("qms-confirm-modal");
    if (old) old.remove();
    var ov = document.createElement("div");
    ov.id = "qms-confirm-modal";
    ov.style.cssText = "position:fixed;inset:0;z-index:9999999;background:rgba(6,8,16,0.8);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;";
    ov.innerHTML =
      '<div style="width:90%;max-width:420px;padding:28px 26px 22px;background:linear-gradient(160deg,rgba(12,16,32,0.98),rgba(8,10,24,0.99));border:1px solid rgba(0,245,255,0.35);border-radius:18px;box-shadow:0 24px 80px rgba(0,0,0,0.7),0 0 40px rgba(0,245,255,0.18);color:#eafcff;font-family:system-ui,-apple-system,sans-serif;">' +
        '<div style="display:flex;align-items:center;gap:14px;margin-bottom:14px;">' +
          '<div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,rgba(0,245,255,0.18),rgba(124,58,237,0.18));border:1px solid rgba(0,245,255,0.5);display:flex;align-items:center;justify-content:center;font-size:20px;">\u2139\uFE0F</div>' +
          '<div>' +
            '<div style="font-size:16px;font-weight:800;background:linear-gradient(90deg,#00f5ff,#7c3aed);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;">Remove from Quick Actions?</div>' +
            '<div style="font-size:11px;letter-spacing:1.5px;opacity:0.6;margin-top:3px;color:#00f5ff;">QMS RISE \u2014 CONFIRM</div>' +
          '</div>' +
        '</div>' +
        '<div style="font-size:13.5px;line-height:1.6;opacity:0.85;margin-bottom:22px;color:#c8e8f0;">Remove <strong style="color:#00f5ff">' + name + '</strong> from Quick Actions?</div>' +
        '<div style="display:flex;gap:10px;justify-content:flex-end;">' +
          '<button id="qms-cancel" style="padding:10px 22px;border-radius:10px;background:rgba(255,255,255,0.05);color:#b6d8e0;border:1px solid rgba(255,255,255,0.18);font-size:12px;font-weight:700;letter-spacing:1.2px;cursor:pointer;">CANCEL</button>' +
          '<button id="qms-remove" style="padding:10px 22px;border-radius:10px;background:linear-gradient(135deg,#00f5ff,#7c3aed);color:#001a1f;border:none;font-size:12px;font-weight:800;letter-spacing:1.2px;cursor:pointer;box-shadow:0 0 22px rgba(0,245,255,0.55);">CONFIRM</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(ov);
    function close() { ov.remove(); }
    ov.querySelector("#qms-cancel").onclick = close;
    ov.onclick = function (e) { if (e.target === ov) close(); };
    ov.querySelector("#qms-remove").onclick = function () { close(); onOk(); };
  }

  function buildPinnedTile(meta) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "sd-qa-tile " + meta.cls;
    b.setAttribute("data-pinned", "1");
    b.setAttribute("data-cat-code", meta.code);
    b.style.position = "relative";
    b.innerHTML =
      '<span class="qa-x" title="Remove">\u00D7</span>' +
      '<span class="sd-qa-icon-badge" style="font-size:20px;">' + meta.icon + '</span>' +
      '<span class="qa-label">' + meta.display + '</span>';
    b.querySelector(".qa-x").onclick = function (e) {
      e.preventDefault(); e.stopPropagation();
      if (!editMode) return;
      qmsConfirm(meta.display, function () {
        unpin(meta.code);
        rerender();
      });
    };
    b.onclick = function (e) {
      if (editMode) { e.preventDefault(); return; }
      if (meta.route && typeof window.navigate === "function") window.navigate(meta.route);
    };
    return b;
  }

  function buildFixedTile(meta) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "sd-qa-tile " + meta.cls;
    b.setAttribute("data-fixed", "1");
    b.setAttribute("data-cat-code", meta.code);
    b.style.position = "relative";
    b.innerHTML =
      '<span class="sd-qa-icon-badge" style="font-size:20px;">' + meta.icon + '</span>' +
      '<span class="qa-label">' + meta.display + '</span>';
    b.onclick = function (e) {
      if (editMode) { e.preventDefault(); return; }
      if (meta.route && typeof window.navigate === "function") window.navigate(meta.route);
    };
    return b;
  }

  function rerender() {
    if (isRendering) return;
    var qa = document.querySelector(".sd-qa-grid");
    if (!qa) return;
    isRendering = true;
    try {
      qa.innerHTML = "";
      var rendered = {};

      FIXED_TILES.forEach(function (m) {
        if (rendered[m.code]) return;
        rendered[m.code] = 1;
        qa.appendChild(buildFixedTile(m));
      });

      layout.pinned.forEach(function (code) {
        if (rendered[code]) return;
        var m = metaByCode(code);
        if (!m) return;
        rendered[code] = 1;
        qa.appendChild(buildPinnedTile(m));
      });

      var userCount = layout.pinned.filter(function (c) {
        return !FIXED_TILES.some(function (m) { return m.code === c; }) && metaByCode(c);
      }).length;
      qa.setAttribute("data-pinned-count", String(userCount));
      qa.setAttribute("data-max-pinned", String(MAX_PINNED));
      qa.setAttribute("data-edit-mode", editMode ? "1" : "0");
    } finally {
      isRendering = false;
    }
  }

  function injectEditButton() {
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

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "qa-edit-btn";
    btn.textContent = editMode ? "Done \u2713" : "Edit";
    btn.style.cssText = "padding:6px 16px;font-size:11px;letter-spacing:1.5px;font-weight:800;background:rgba(0,245,255,0.08);color:#00f5ff;border:1px solid rgba(0,245,255,0.6);border-radius:8px;cursor:pointer;margin-left:auto;";
    btn.onclick = function () { toggleEdit(!editMode); };
    header.appendChild(btn);
  }

  function toggleEdit(on) {
    editMode = !!on;
    var qa = document.querySelector(".sd-qa-grid");
    if (qa) qa.setAttribute("data-edit-mode", editMode ? "1" : "0");
    var btn = document.querySelector(".qa-edit-btn");
    if (btn) {
      btn.textContent = editMode ? "Done \u2713" : "Edit";
      btn.style.background = editMode ? "rgba(0,245,255,0.28)" : "rgba(0,245,255,0.08)";
      btn.style.color = editMode ? "#001a1f" : "#00f5ff";
      btn.style.boxShadow = editMode ? "0 0 16px rgba(0,245,255,0.7)" : "none";
    }
    document.querySelectorAll(".sd-qa-tile .qa-x").forEach(function (x) {
      x.style.display = editMode ? "flex" : "none";
    });
    if (!editMode) scheduleSave();
  }

  function injectStyles() {
    if (document.getElementById("dash-drag-styles")) return;
    var s = document.createElement("style");
    s.id = "dash-drag-styles";
    s.textContent = [
      ".sd-qa-tile{position:relative !important;cursor:grab !important}",
      ".sd-qa-tile:active{cursor:grabbing !important}",
      ".sd-qa-tile:hover{box-shadow:0 0 0 1px rgba(0,245,255,0.5),0 8px 24px rgba(0,245,255,0.28) !important;transform:translateY(-2px) !important}",
      ".qa-x{display:none;position:absolute;top:-8px;right:-8px;width:26px;height:26px;border-radius:50%;background:#ff3860;border:2px solid #0a0e1a;color:#fff;font-size:16px;font-weight:900;line-height:1;align-items:center;justify-content:center;cursor:pointer;z-index:999;padding:0;box-shadow:0 0 14px rgba(255,56,96,0.85);}",
      ".qa-x:hover{transform:scale(1.25)}",
      ".sd-qa-grid[data-edit-mode='1'] .sd-qa-tile[data-pinned='1'] .qa-x{display:flex !important}",
      ".sd-qa-grid[data-edit-mode='1'] .sd-qa-tile[data-pinned='1']{box-shadow:0 0 0 2px rgba(255,56,96,0.65) !important}",
      ".sd-cat-ghost,.sd-qa-ghost{opacity:0.3 !important;border:1px dashed rgba(0,245,255,0.7) !important}",
      ".sd-cat-chosen,.sd-qa-chosen{box-shadow:0 0 0 2px rgba(0,245,255,0.75) !important;transform:scale(1.05) !important}"
    ].join("\n");
    document.head.appendChild(s);
  }

  function attachSortable() {
    if (typeof Sortable === "undefined") return;
    var cats = document.querySelector(".sd-cats-grid");
    var qa = document.querySelector(".sd-qa-grid");
    if (!cats || !qa) return;
    if (!cats.dataset.sA) {
      Sortable.create(cats, {
        animation: 180, delay: 100, delayOnTouchOnly: true,
        ghostClass: "sd-cat-ghost", chosenClass: "sd-cat-chosen",
        group: { name: "dash", pull: "clone", put: false },
        onEnd: function () {}
      });
      cats.dataset.sA = "1";
    }
    if (!qa.dataset.sA) {
      Sortable.create(qa, {
        animation: 180, delay: 100, delayOnTouchOnly: true,
        ghostClass: "sd-qa-ghost", chosenClass: "sd-qa-chosen",
        group: { name: "dash", pull: false, put: true },
        onAdd: function (evt) {
          var label = catLabel(evt.clone || evt.item);
          var meta = CAT_META[label];
          var item = evt.item;
          if (!meta) { item.remove(); return; }
          if (pin(meta.code)) {
            item.remove();
            rerender();
            window.QMS && QMS.showToast && QMS.showToast("Pinned " + label, "success");
          } else {
            item.remove();
          }
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
    injectEditButton();
    var hash = JSON.stringify(layout.pinned) + editMode;
    if (hash !== lastHash) {
      lastHash = hash;
      rerender();
    }
    attachSortable();
  }

  var pend = false;
  function schedule() {
    if (pend) return;
    pend = true;
    setTimeout(function () { pend = false; attach(); }, 500);
  }

  function start() {
    injectStyles();
    hydrate().then(schedule);
    var obs = new MutationObserver(function () {
      if (isRendering) return;
      schedule();
    });
    obs.observe(document.body, { childList: true, subtree: false });
    console.log("[dash-drag] v20 ready");
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();

  window.resetDashboardOrder = function () {
    localStorage.removeItem(LS_KEY);
    layout = { pinned: [] };
    save().then(function () { location.reload(); });
  };
})();