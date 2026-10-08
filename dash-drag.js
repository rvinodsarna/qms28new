/* dash-drag.js — bidirectional drag & edit mode (v11)
 * Features:
 *  - Drag RISE category -> Quick Actions grid to pin (up to 6)
 *  - Drag pinned tile out to unpin
 *  - Reorder within either grid
 *  - Edit button toggles red x on every pinned tile
 *  - No animation replay on re-render (fixes blinking)
 */
(function () {
  "use strict";
  if (window.__dashDrag) return;
  window.__dashDrag = true;

  var MAX_PINNED = 10;
  var LS_KEY = "qms.dashOrder.v1";
  var TABLE = "user_dashboard_layout";
  var layout = { cats: [], qa: [], pinned: [] };
  var hydrated = false;
  var currentUserId = null;
  var saveTimer = null;
  var editMode = false;
  var pinnedRendered = {};

  var FIXED_TILES = [
    { icon: "\uD83D\uDCC5", code: "timetable",        route: "timetable",         cls: "qa-cyan",    display: "Timetable" },
    { icon: "\uD83D\uDCDA", code: "study-plan",       route: "study-plan",        cls: "qa-violet",  display: "Study Plan" },
    { icon: "\uD83C\uDF93", code: "academic-support", route: "academic-support",  cls: "qa-green",   display: "Academic Support" },
    { icon: "\uD83D\uDCC8", code: "my-progress",      route: "my-progress",       cls: "qa-magenta", display: "My Progress" }
  ];

  var CAT_META = {
    "Attendance":          { icon: "\uD83D\uDCC5", code: "attendance",        route: "qr-scanner",        cls: "qa-cyan",    display: "Attendance" },
    "Evaluation":          { icon: "\uD83D\uDCDD", code: "evaluation",        route: "evaluation",        cls: "qa-violet",  display: "Evaluation" },
    "Quiz Battle":         { icon: "\u26A1",         code: "quiz",              route: "quiz",              cls: "qa-magenta", display: "Quiz Battle" },
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
      if (r.error) { console.warn("[dash-drag] hydrate:", r.error.message); return; }
      if (r.data && r.data.layout && typeof r.data.layout === "object") {
        layout = Object.assign(layout, r.data.layout);
        if (!layout.pinned) layout.pinned = [];
        lsSave();
        console.log("[dash-drag] hydrated from Supabase");
      }
    } catch (e) { console.warn("[dash-drag] hydrate failed:", e); }
  }

  async function save() {
    lsSave();
    var sb = window.qmsSupabase;
    if (!sb || !currentUserId) return;
    try {
      var r = await sb.from(TABLE).upsert({
        user_id: currentUserId, layout: layout, updated_at: new Date().toISOString()
      }, { onConflict: "user_id" });
      if (r.error) console.warn("[dash-drag] save:", r.error.message);
    } catch (e) { console.warn("[dash-drag] save failed:", e); }
  }
  function scheduleSave() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 500);
  }

  function isPinned(code) { return layout.pinned.indexOf(code) !== -1; }
  function pin(code) {
    // Block fixed tiles from being pinned by user
    var isFixed = FIXED_TILES.some(function (m) { return m.code === code; });
    if (isFixed) {
      window.QMS && QMS.showToast && QMS.showToast("Already in Quick Actions", "info");
      return false;
    }
    // Block duplicates
    if (isPinned(code)) {
      window.QMS && QMS.showToast && QMS.showToast("Already pinned", "warning");
      return false;
    }
    // Enforce max
    var fixedCodes = FIXED_TILES.map(function (m) { return m.code; });
    var userPinned = layout.pinned.filter(function (c) { return fixedCodes.indexOf(c) === -1; });
    if (userPinned.length >= MAX_PINNED) {
      window.QMS && QMS.showToast && QMS.showToast("Quick Actions is full (max " + MAX_PINNED + " custom pins)", "warning");
      return false;
    }
    layout.pinned.push(code);
    scheduleSave();
    return true;
  }
  function unpin(code) {
    var i = layout.pinned.indexOf(code);
    if (i === -1) return false;
    layout.pinned.splice(i, 1);
    scheduleSave();
    return true;
  }

  function metaByCode(code) {
    for (var k in CAT_META) if (CAT_META[k].code === code) return CAT_META[k];
    return null;
  }

  
  /* ---------- QMS-styled confirm modal ---------- */
  function qmsConfirm(message, onConfirm) {
    var existing = document.getElementById("qms-confirm-modal");
    if (existing) existing.remove();

    var overlay = document.createElement("div");
    overlay.id = "qms-confirm-modal";
    overlay.style.cssText =
      "position:fixed;inset:0;z-index:9999999;" +
      "background:rgba(6,8,16,0.78);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);" +
      "display:flex;align-items:center;justify-content:center;" +
      "animation:qmsFadeIn 0.2s ease;";

    var box = document.createElement("div");
    box.style.cssText =
      "width:90%;max-width:420px;padding:28px 26px 22px;" +
      "background:linear-gradient(160deg,rgba(12,16,32,0.98),rgba(8,10,24,0.99));" +
      "border:1px solid rgba(0,245,255,0.35);border-radius:18px;" +
      "box-shadow:0 24px 80px rgba(0,0,0,0.7),0 0 40px rgba(0,245,255,0.18),inset 0 1px 0 rgba(255,255,255,0.05);" +
      "font-family:system-ui,-apple-system,sans-serif;color:#eafcff;" +
      "animation:qmsSlideUp 0.3s cubic-bezier(0.34,1.56,0.64,1);";

    box.innerHTML =
      '<div style="display:flex;align-items:center;gap:14px;margin-bottom:14px;">' +
        '<div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,rgba(0,245,255,0.18),rgba(124,58,237,0.18));border:1px solid rgba(0,245,255,0.5);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;box-shadow:0 0 20px rgba(0,245,255,0.35);">\u2139\uFE0F</div>' +
        '<div>' +
          '<div style="font-size:16px;font-weight:800;letter-spacing:0.4px;background:linear-gradient(90deg,#00f5ff,#7c3aed);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;">Remove from Quick Actions?</div>' +
          '<div style="font-size:11px;letter-spacing:1.5px;opacity:0.55;margin-top:4px;color:#00f5ff;">QMS RISE \u2014 CONFIRM ACTION</div>' +
        '</div>' +
      '</div>' +
      '<div style="font-size:13.5px;line-height:1.6;opacity:0.85;margin-bottom:22px;padding-left:2px;color:#c8e8f0;">' + message + '</div>' +
      '<div style="display:flex;gap:10px;justify-content:flex-end;">' +
        '<button id="qms-cancel" style="padding:10px 22px;border-radius:10px;background:rgba(255,255,255,0.05);color:#b6d8e0;border:1px solid rgba(255,255,255,0.18);font-size:12px;font-weight:700;letter-spacing:1.2px;cursor:pointer;transition:all .18s;">CANCEL</button>' +
        '<button id="qms-remove" style="padding:10px 22px;border-radius:10px;background:linear-gradient(135deg,#00f5ff,#7c3aed);color:#001a1f;border:none;font-size:12px;font-weight:800;letter-spacing:1.2px;cursor:pointer;box-shadow:0 0 22px rgba(0,245,255,0.55);transition:all .18s;">CONFIRM</button>' +
      '</div>';

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    if (!document.getElementById("qms-modal-anim")) {
      var st = document.createElement("style");
      st.id = "qms-modal-anim";
      st.textContent =
        "@keyframes qmsFadeIn{from{opacity:0}to{opacity:1}}" +
        "@keyframes qmsSlideUp{from{opacity:0;transform:translateY(20px) scale(0.95)}to{opacity:1;transform:translateY(0) scale(1)}}";
      document.head.appendChild(st);
    }

    function close() { overlay.remove(); }
    var cancelBtn = document.getElementById("qms-cancel");
    var removeBtn = document.getElementById("qms-remove");

    cancelBtn.addEventListener("mouseenter", function () { cancelBtn.style.background = "rgba(0,245,255,0.12)"; cancelBtn.style.borderColor = "rgba(0,245,255,0.5)"; cancelBtn.style.color = "#00f5ff"; });
    cancelBtn.addEventListener("mouseleave", function () { cancelBtn.style.background = "rgba(255,255,255,0.05)"; cancelBtn.style.borderColor = "rgba(255,255,255,0.18)"; cancelBtn.style.color = "#b6d8e0"; });
    removeBtn.addEventListener("mouseenter", function () { removeBtn.style.transform = "scale(1.04)"; removeBtn.style.boxShadow = "0 0 30px rgba(0,245,255,0.8)"; });
    removeBtn.addEventListener("mouseleave", function () { removeBtn.style.transform = ""; removeBtn.style.boxShadow = "0 0 22px rgba(0,245,255,0.55)"; });

    cancelBtn.addEventListener("click", close);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
    document.addEventListener("keydown", function esc(e) {
      if (e.key === "Escape") { close(); document.removeEventListener("keydown", esc); }
    });
    removeBtn.addEventListener("click", function () { close(); onConfirm(); });
  }
  window.__qmsConfirm = qmsConfirm;

function buildTile(meta) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "sd-qa-tile " + meta.cls;
    btn.setAttribute("data-pinned", "1");
    btn.setAttribute("data-cat-code", meta.code);
    btn.style.position = "relative";
    btn.innerHTML =
      '<span class="qa-x" title="Remove">\u00D7</span>' +
      '<span class="sd-qa-icon-badge" style="font-size:20px;">' + meta.icon + '</span>' +
      '<span class="qa-label">' + (meta.display || meta.code) + '</span>';
    btn.querySelector(".qa-x").addEventListener("click", function (e) {
      e.preventDefault(); e.stopPropagation();
      if (!editMode) return;
      window.__qmsConfirm("Are you sure you want to remove <strong style='color:#00f5ff'>" + (meta.display || meta.code) + "</strong> from Quick Actions?<br/><br/><span style='font-size:11.5px;opacity:0.55'>You can pin it again anytime by dragging the card from RISE Categories.</span>", function () {
        unpin(meta.code);
        rerenderPinned();
        window.QMS && QMS.showToast && QMS.showToast("Removed " + meta.display, "success");
      });
    });
    btn.addEventListener("click", function (e) {
      if (editMode) { e.preventDefault(); return; }
      if (meta.route && typeof window.navigate === "function") window.navigate(meta.route);
    });
    return btn;
  }

  function rerenderPinned() {
    var qa = document.querySelector(".sd-qa-grid");
    if (!qa) return;

    // Remove all our injected tiles
    qa.querySelectorAll('[data-pinned="1"], [data-fixed="1"]').forEach(function (el) { el.remove(); });

    // What categories already exist from app.js? (QR Attendance, Quiz Battle, etc.)
    var existing = {};
    Array.from(qa.querySelectorAll(".sd-qa-tile")).forEach(function (tile) {
      var label = tile.textContent.replace(/\s+/g, " ").trim().toLowerCase();
      // Normalize common aliases
      if (label.indexOf("qr attendance") !== -1 || label === "attendance") existing["attendance"] = 1;
      if (label.indexOf("quiz") !== -1) existing["quiz"] = 1;
      if (label.indexOf("academic support") !== -1) existing["academic-support"] = 1;
      if (label.indexOf("my progress") !== -1) existing["my-progress"] = 1;
      if (label.indexOf("timetable") !== -1) existing["timetable"] = 1;
      if (label.indexOf("study plan") !== -1) existing["study-plan"] = 1;
      if (label.indexOf("evaluation") !== -1) existing["evaluation"] = 1;
      if (label.indexOf("clubs") !== -1) existing["positions"] = 1;
      if (label.indexOf("streak") !== -1) existing["streak"] = 1;
      if (label.indexOf("workshop") !== -1) existing["workshops"] = 1;
      if (label.indexOf("competition") !== -1) existing["competitions"] = 1;
      if (label.indexOf("coursera") !== -1) existing["coursera"] = 1;
      if (label.indexOf("award") !== -1) existing["award_recognition"] = 1;
      if (label.indexOf("bonus") !== -1) existing["bonus"] = 1;
    });

    var rendered = {};

    // 1) Fixed tiles — only add if not already present from app.js
    FIXED_TILES.forEach(function (meta) {
      if (existing[meta.code] || rendered[meta.code]) return;
      rendered[meta.code] = 1;
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "sd-qa-tile " + meta.cls;
      btn.setAttribute("data-fixed", "1");
      btn.setAttribute("data-cat-code", meta.code);
      btn.style.position = "relative";
      btn.innerHTML =
        '<span class="sd-qa-icon-badge" style="font-size:20px;">' + meta.icon + '</span>' +
        '<span class="qa-label">' + meta.display + '</span>';
      btn.addEventListener("click", function (e) {
        if (editMode) { e.preventDefault(); return; }
        if (meta.route && typeof window.navigate === "function") window.navigate(meta.route);
      });
      qa.appendChild(btn);
    });

    // 2) User-pinned tiles — dedupe by code, skip anything already rendered
    layout.pinned.forEach(function (code) {
      if (rendered[code] || existing[code]) return;
      var meta = metaByCode(code);
      if (!meta) return;
      rendered[code] = 1;
      qa.appendChild(buildTile(meta));
    });

    var userCount = Object.keys(rendered).length - FIXED_TILES.filter(function (m) { return rendered[m.code]; }).length;
    qa.setAttribute("data-pinned-count", String(userCount));
    qa.setAttribute("data-max-pinned", String(MAX_PINNED));
    qa.setAttribute("data-edit-mode", editMode ? "1" : "0");
  }

  function injectEditButton() {
    var qa = document.querySelector(".sd-qa-grid");
    if (!qa) return;
    var card = qa.closest(".glass-card") || qa.parentElement;
    if (!card) return;
    var header = card.querySelector(".card-header");
    if (!header) return;
    if (header.querySelector(".qa-edit-btn")) {
      // Already exists — make sure text state is right
      var existing = header.querySelector(".qa-edit-btn");
      existing.textContent = editMode ? "Done \u2713" : "Edit";
      return;
    }

    header.style.display = "flex";
    header.style.justifyContent = "space-between";
    header.style.alignItems = "center";

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "qa-edit-btn";
    btn.textContent = editMode ? "Done \u2713" : "Edit";
    btn.style.cssText =
      "padding:6px 16px;font-size:11px;letter-spacing:1.5px;font-weight:800;" +
      "background:rgba(0,245,255,0.08);color:#00f5ff;" +
      "border:1px solid rgba(0,245,255,0.6);border-radius:8px;" +
      "cursor:pointer;transition:all 0.2s;margin-left:auto;" +
      "text-shadow:0 0 6px rgba(0,245,255,0.5);";
    btn.addEventListener("click", function () { toggleEdit(!editMode); });
    header.appendChild(btn);
  }

  function toggleEdit(on) {
    editMode = !!on;
    var qa = document.querySelector(".sd-qa-grid");
    var cats = document.querySelector(".sd-cats-grid");
    if (qa) qa.setAttribute("data-edit-mode", editMode ? "1" : "0");
    if (cats) cats.setAttribute("data-edit-mode", editMode ? "1" : "0");

    var btn = document.querySelector(".qa-edit-btn");
    if (btn) {
      btn.textContent = editMode ? "Done \u2713" : "Edit";
      btn.style.background = editMode ? "rgba(0,245,255,0.28)" : "rgba(0,245,255,0.08)";
      btn.style.color = editMode ? "#001a1f" : "#00f5ff";
      btn.style.borderColor = "#00f5ff";
      btn.style.boxShadow = editMode ? "0 0 16px rgba(0,245,255,0.7)" : "none";
    }

    // Force immediate CSS visibility toggle for x buttons
    document.querySelectorAll(".sd-qa-tile .qa-x").forEach(function (x) {
      x.style.display = editMode ? "flex" : "none";
    });

    if (!editMode) scheduleSave();

    if (window.QMS && QMS.showToast) {
      QMS.showToast(editMode ? "Edit mode — tap \u00D7 to remove" : "Saved", editMode ? "info" : "success");
    }
    console.log("[dash-drag] editMode =", editMode);
  }

  function injectStyles() {
    if (document.getElementById("dash-drag-styles")) return;
    var s = document.createElement("style");
    s.id = "dash-drag-styles";
    s.textContent = [
      ".sd-cat-card{cursor:grab !important;transition:box-shadow .2s,transform .2s !important}",
      ".sd-cat-card:active{cursor:grabbing !important}",
      ".sd-cat-card:hover{box-shadow:0 0 0 1px rgba(0,245,255,0.4),0 8px 24px rgba(0,245,255,0.18) !important;transform:translateY(-2px) !important}",
      ".sd-qa-tile{cursor:grab !important;transition:box-shadow .2s,transform .2s !important}",
      ".sd-qa-tile:active{cursor:grabbing !important}",
      ".sd-qa-tile:hover{box-shadow:0 0 0 1px rgba(0,245,255,0.5),0 8px 24px rgba(0,245,255,0.28) !important;transform:translateY(-2px) scale(1.02) !important}",
      ".sd-cat-ghost,.sd-qa-ghost{opacity:0.28 !important;transform:scale(0.97) !important;border:1px dashed rgba(0,245,255,0.6) !important}",
      ".sd-cat-chosen,.sd-qa-chosen{box-shadow:0 0 0 2px rgba(0,245,255,0.75),0 12px 32px rgba(0,245,255,0.35) !important;transform:scale(1.05) rotate(-1deg) !important;z-index:999}",
      ".sd-cat-drag,.sd-qa-drag{opacity:0.98 !important;transform:scale(1.08) rotate(2deg) !important;box-shadow:0 20px 48px rgba(0,245,255,0.5) !important}",
      ".qa-x{display:none;position:absolute;top:-8px;right:-8px;width:26px;height:26px;border-radius:50%;background:#ff3860;border:2px solid #0a0e1a;color:#fff;font-size:16px;font-weight:900;line-height:1;align-items:center;justify-content:center;cursor:pointer;z-index:999;padding:0;box-shadow:0 0 14px rgba(255,56,96,0.85),0 0 0 3px rgba(255,56,96,0.25);transition:transform .15s}",
      ".qa-x:hover{transform:scale(1.25) rotate(90deg)}",
      ".sd-qa-grid[data-edit-mode='1'] .sd-qa-tile[data-pinned='1'] .qa-x{display:flex !important}",
      ".sd-qa-grid[data-edit-mode='1'] .sd-qa-tile[data-pinned='1']{box-shadow:0 0 0 2px rgba(255,56,96,0.65),0 0 22px rgba(255,56,96,0.45) !important}",
      ".sd-qa-grid{position:relative}",
      ".sd-qa-grid[data-pinned-count]::before{content:attr(data-pinned-count) ' / ' attr(data-max-pinned) ' pinned';position:absolute;bottom:-16px;right:0;font-size:10px;letter-spacing:1.5px;opacity:0.5}",
      ".sd-qa-tile[data-fixed='1']::after{content:'FIXED';position:absolute;top:-6px;left:-6px;padding:2px 6px;font-size:8px;letter-spacing:1px;font-weight:800;background:rgba(0,245,255,0.2);color:#00f5ff;border:1px solid rgba(0,245,255,0.5);border-radius:4px;text-shadow:0 0 6px rgba(0,245,255,0.6)}",
      ".sd-qa-tile[data-fixed='1']{cursor:default !important}"
    ].join(String.fromCharCode(10));
    document.head.appendChild(s);
  }

  function attachSortables() {
    if (typeof Sortable === "undefined") return;
    var cats = document.querySelector(".sd-cats-grid");
    var qa = document.querySelector(".sd-qa-grid");
    if (!cats || !qa) return;

    if (!cats.dataset.sortableAttached) {
      Sortable.create(cats, {
        animation: 220,
        delay: 100,
        delayOnTouchOnly: true,
        ghostClass: "sd-cat-ghost",
        chosenClass: "sd-cat-chosen",
        dragClass: "sd-cat-drag",
        group: { name: "dash", pull: "clone", put: true },
        onEnd: function (evt) {
          if (evt.from === cats && evt.to === cats) {
            layout.cats = Array.prototype.slice.call(cats.querySelectorAll(".sd-cat-card")).map(catLabel);
            scheduleSave();
          }
        }
      });
      cats.dataset.sortableAttached = "1";
    }

    if (!qa.dataset.sortableAttached) {
      Sortable.create(qa, {
        animation: 220,
        delay: 100,
        delayOnTouchOnly: true,
        ghostClass: "sd-qa-ghost",
        chosenClass: "sd-qa-chosen",
        dragClass: "sd-qa-drag",
        group: { name: "dash", pull: true, put: true },
        onAdd: function (evt) {
          var label = catLabel(evt.clone || evt.item);
          var meta = CAT_META[label];
          if (!meta) { evt.item.remove(); return; }
          if (pin(meta.code)) {
            evt.item.remove();
            rerenderPinned();
            window.QMS && QMS.showToast && QMS.showToast("Pinned " + label, "success");
          } else {
            evt.item.remove();
          }
        },
        onRemove: function (evt) {
          if (evt.item.getAttribute("data-fixed") === "1") {
            // Can't remove fixed tiles — put it back
            evt.from.appendChild(evt.item);
            window.QMS && QMS.showToast && QMS.showToast("Fixed tile — cannot be removed", "warning");
            return;
          }
          var code = evt.item.getAttribute("data-cat-code");
          if (code) {
            unpin(code);
            evt.item.remove();
            rerenderPinned();
            window.QMS && QMS.showToast && QMS.showToast("Unpinned", "info");
          }
        }
      });
      qa.dataset.sortableAttached = "1";
    }
  }

  function attach() {
    var u = window.QMS && window.QMS.state && window.QMS.state.user;
    if (!u || u.role !== "student") return;
    var cats = document.querySelector(".sd-cats-grid");
    var qa = document.querySelector(".sd-qa-grid");
    if (!cats || !qa) return;

    document.body.setAttribute("data-drag-ready", "1");
    injectEditButton();
    rerenderPinned();
    attachSortables();
  }

  var pending = false;
  function scan() {
    if (pending) return;
    pending = true;
    setTimeout(function () { pending = false; attach(); }, 400);
  }

  function start() {
    injectStyles();
    hydrate().then(scan);
    new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
    console.log("[dash-drag] v11 — edit mode + no animation flicker");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();

  window.resetDashboardOrder = function () {
    localStorage.removeItem(LS_KEY);
    layout = { cats: [], qa: [], pinned: [] };
    save().then(function () { location.reload(); });
  };
})();
