const fs = require("fs");

const dashDrag = `/* dash-drag.js — bidirectional drag & edit mode (v11)
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

  var MAX_PINNED = 6;
  var LS_KEY = "qms.dashOrder.v1";
  var TABLE = "user_dashboard_layout";
  var layout = { cats: [], qa: [], pinned: [] };
  var hydrated = false;
  var currentUserId = null;
  var saveTimer = null;
  var editMode = false;
  var pinnedRendered = {};

  var CAT_META = {
    "Attendance":          { icon: "\\uD83D\\uDCC5", code: "attendance",        route: "qr-scanner",        cls: "qa-cyan",    display: "Attendance" },
    "Evaluation":          { icon: "\\uD83D\\uDCDD", code: "evaluation",        route: "evaluation",        cls: "qa-violet",  display: "Evaluation" },
    "Quiz Battle":         { icon: "\\u26A1",         code: "quiz",              route: "quiz",              cls: "qa-magenta", display: "Quiz Battle" },
    "Bonus":               { icon: "\\uD83C\\uDFAF", code: "bonus",             route: "bonus",             cls: "qa-gold",    display: "Bonus" },
    "Clubs & Roles":       { icon: "\\uD83C\\uDFDB", code: "positions",         route: "student-clubs",     cls: "qa-green",   display: "Clubs & Roles" },
    "Streak":              { icon: "\\uD83D\\uDD25", code: "streak",            route: "my-progress",       cls: "qa-magenta", display: "Streak" },
    "Workshops & Talks":   { icon: "\\uD83C\\uDF93", code: "workshops",         route: "events",            cls: "qa-violet",  display: "Workshops & Talks" },
    "Competitions":        { icon: "\\uD83C\\uDFC6", code: "competitions",      route: "events",            cls: "qa-green",   display: "Competitions" },
    "Coursera":            { icon: "\\uD83D\\uDCD8", code: "coursera",          route: "certificates",      cls: "qa-cyan",    display: "Coursera" },
    "Award & Recognition": { icon: "\\uD83C\\uDFC5", code: "award_recognition", route: "award-recognition", cls: "qa-gold",    display: "Award & Recognition" }
  };

  function catLabel(card) {
    var n = card.querySelector(".sd-cat-name");
    if (!n) return "";
    var clone = n.cloneNode(true);
    var b = clone.querySelector(".sd-cat-icon-badge");
    if (b) b.remove();
    return clone.textContent.replace(/\\s+/g, " ").trim();
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
    if (isPinned(code)) return true;
    if (layout.pinned.length >= MAX_PINNED) {
      window.QMS && QMS.showToast && QMS.showToast("Quick Actions is full (max " + MAX_PINNED + ")", "warning");
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

  function buildTile(meta) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "sd-qa-tile " + meta.cls;
    btn.setAttribute("data-pinned", "1");
    btn.setAttribute("data-cat-code", meta.code);
    btn.style.position = "relative";
    btn.innerHTML =
      '<span class="qa-x" title="Remove">\\u00D7</span>' +
      '<span class="sd-qa-icon-badge" style="font-size:20px;">' + meta.icon + '</span>' +
      '<span class="qa-label">' + (meta.display || meta.code) + '</span>';
    btn.querySelector(".qa-x").addEventListener("click", function (e) {
      e.preventDefault(); e.stopPropagation();
      if (!editMode) return;
      unpin(meta.code);
      rerenderPinned();
      window.QMS && QMS.showToast && QMS.showToast("Removed " + meta.display, "success");
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
    // Remove existing pinned tiles
    qa.querySelectorAll('[data-pinned="1"]').forEach(function (el) { el.remove(); });
    // Add pinned tiles at the end
    layout.pinned.forEach(function (code) {
      var meta = metaByCode(code);
      if (!meta) return;
      qa.appendChild(buildTile(meta));
    });
    qa.setAttribute("data-pinned-count", String(layout.pinned.length));
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
      existing.textContent = editMode ? "Done \\u2713" : "Edit";
      return;
    }

    header.style.display = "flex";
    header.style.justifyContent = "space-between";
    header.style.alignItems = "center";

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "qa-edit-btn";
    btn.textContent = editMode ? "Done \\u2713" : "Edit";
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
      btn.textContent = editMode ? "Done \\u2713" : "Edit";
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
      QMS.showToast(editMode ? "Edit mode — tap \\u00D7 to remove" : "Saved", editMode ? "info" : "success");
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
      ".sd-qa-grid[data-edit-mode='1']::after{content:'EDIT MODE \\u2014 tap \\u00D7 to remove, then Done';position:absolute;top:-30px;right:0;font-size:10px;letter-spacing:1.5px;color:#ff3860;font-weight:800;text-shadow:0 0 8px rgba(255,56,96,0.6)}"
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
`;

fs.writeFileSync("dash-drag.js", dashDrag, "utf8");
console.log("wrote dash-drag.js (" + fs.statSync("dash-drag.js").size + " bytes)");

// Bump version in index.html
let html = fs.readFileSync("index.html", "utf8");
const before = html;
html = html.replace(/dash-drag\.js\?v=\d+/g, "dash-drag.js?v=11");
fs.writeFileSync("index.html", html, "utf8");
console.log("bumped dash-drag to v=11:", html !== before);
