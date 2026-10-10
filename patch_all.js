const fs = require("fs");

/* ============================================================
   1. navbar-anim.css  — logo pulse + green laser school name
   ============================================================ */
const navbarCss = `/* navbar-anim.css — animated topbar logo + green laser school name */

/* Logo pulse + rotation ring */
.topbar-logo > *:first-child,
.topbar-logo img,
.topbar-logo svg,
#app .topbar-logo > div {
  animation: navLogoFloat 3.2s ease-in-out infinite !important;
  transform-origin: center center;
  will-change: transform, filter;
}
@keyframes navLogoFloat {
  0%,100% { transform: translateY(0) scale(1); filter: drop-shadow(0 0 6px rgba(0,245,255,0.55)) drop-shadow(0 0 14px rgba(124,58,237,0.35)); }
  50%     { transform: translateY(-3px) scale(1.06); filter: drop-shadow(0 0 14px rgba(0,245,255,0.9)) drop-shadow(0 0 26px rgba(124,58,237,0.7)); }
}

/* Green laser text effect on school name / subtitle */
.topbar-logo-sub,
.topbar-logo-sub > *,
.topbar .topbar-logo-sub,
#app .topbar-logo-sub,
.school-name,
.school-name-green,
.topbar-subtitle {
  background: linear-gradient(90deg,#00ff88 0%,#7dffb0 25%,#00ff88 50%,#00c46a 75%,#00ff88 100%) !important;
  background-size: 300% 100% !important;
  -webkit-background-clip: text !important;
  background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
  color: transparent !important;
  animation: navLaser 2.4s linear infinite !important;
  text-shadow: 0 0 12px rgba(0,255,136,0.55), 0 0 24px rgba(0,255,136,0.25) !important;
  font-weight: 700 !important;
  letter-spacing: 0.05em !important;
  position: relative;
}
@keyframes navLaser {
  0%   { background-position: 0% 50%; }
  100% { background-position: 300% 50%; }
}

/* Fast scan-line shimmer overlay */
.topbar-logo-sub::after {
  content: "";
  position: absolute; inset: 0;
  background: linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.7) 50%,transparent 100%);
  background-size: 200% 100%;
  mix-blend-mode: screen;
  pointer-events: none;
  animation: navShimmer 2.6s ease-in-out infinite;
  opacity: 0.6;
}
@keyframes navShimmer {
  0%,100% { background-position: -100% 0; opacity: 0.25; }
  50%     { background-position: 200% 0;  opacity: 0.85; }
}

/* Respect reduced motion */
@media (prefers-reduced-motion: reduce) {
  .topbar-logo *,
  .topbar-logo-sub,
  .topbar-logo-sub * { animation: none !important; }
}
`;

fs.writeFileSync("navbar-anim.css", navbarCss, "utf8");
console.log("[1/3] wrote navbar-anim.css (" + navbarCss.length + " bytes)");

/* ============================================================
   2. dash-drag.js — bidirectional drag + edit mode with red X
   ============================================================ */
const dashDrag = `/* dash-drag.js — bidirectional drag & drop between RISE Categories and Quick Actions
 * - Drag RISE category to Quick Actions grid → pin (up to 6)
 * - Drag pinned tile outside Quick Actions → unpin
 * - Reorder within each grid freely
 * - Edit button (top-left of Quick Actions header): shows red × on each editable tile
 * - Order + pins saved per-user in Supabase (user_dashboard_layout) + localStorage cache
 */
(function () {
  "use strict";
  if (window.__dashDrag) return;
  window.__dashDrag = true;

  var MAX_PINNED = 6;
  var LS_KEY = "qms.dashOrder.v1";
  var TABLE  = "user_dashboard_layout";
  var layout = { cats: [], qa: [], pinned: [] };
  var hydrated = false;
  var currentUserId = null;
  var saveTimer = null;
  var editMode = false;

  var CAT_META = {
    "Attendance":              { icon: "📅", code: "attendance",        route: "qr-scanner",        cls: "qa-cyan" },
    "Evaluation":              { icon: "📝", code: "evaluation",        route: "evaluation",        cls: "qa-violet" },
    "Quiz Battle":             { icon: "⚡", code: "quiz",              route: "quiz",              cls: "qa-magenta" },
    "Bonus":                   { icon: "🎯", code: "bonus",             route: "bonus",             cls: "qa-gold" },
    "Clubs & Roles":           { icon: "🏛", code: "positions",         route: "student-clubs",     cls: "qa-green" },
    "Streak":                  { icon: "🔥", code: "streak",            route: "my-progress",       cls: "qa-magenta" },
    "Workshops & Talks":       { icon: "🎓", code: "workshops",         route: "events",            cls: "qa-violet" },
    "Competitions":            { icon: "🏆", code: "competitions",      route: "events",            cls: "qa-green" },
    "Coursera":                { icon: "📘", code: "coursera",          route: "certificates",      cls: "qa-cyan" },
    "Award & Recognition":     { icon: "🏅", code: "award_recognition", route: "award-recognition", cls: "qa-gold" }
  };

  function catLabel(card) {
    var n = card.querySelector(".sd-cat-name");
    if (!n) return "";
    var clone = n.cloneNode(true);
    var badge = clone.querySelector(".sd-cat-icon-badge");
    if (badge) badge.remove();
    return clone.textContent.replace(/\\s+/g, " ").trim();
  }

  function lsLoad() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}") || {}; }
    catch (e) { return {}; }
  }
  function lsSave() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(layout)); } catch (e) {}
  }

  function containerKey(kind) { return "sd-cats-" + kind; }

  async function hydrate() {
    if (hydrated) return; hydrated = true;
    layout = Object.assign(layout, lsLoad());
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

  /* ---------- pin/unpin ---------- */
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

  /* ---------- render pinned tiles ---------- */
  function renderTile(meta) {
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
      unpin(meta.code);
      rerenderPinned();
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
    // remove only our pinned tiles
    qa.querySelectorAll('[data-pinned="1"]').forEach(function (el) { el.remove(); });
    // remove any already-existing tiles that match a pinned code (avoid dupes)
    layout.pinned.forEach(function (code) {
      var meta = null;
      Object.keys(CAT_META).forEach(function (k) { if (CAT_META[k].code === code) meta = CAT_META[k]; });
      if (!meta) return;
      meta.display = meta.display || code;
      qa.appendChild(renderTile(meta));
    });
    qa.setAttribute("data-pinned-count", String(layout.pinned.length));
    qa.setAttribute("data-max-pinned", String(MAX_PINNED));
    qa.setAttribute("data-edit-mode", editMode ? "1" : "0");
  }

  /* ---------- edit button ---------- */
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

    var wrap = document.createElement("div");
    wrap.style.cssText = "display:flex;gap:8px;align-items:center;margin-left:auto;";

    var editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "qa-edit-btn";
    editBtn.textContent = "Edit";
    editBtn.style.cssText =
      "padding:5px 14px;font-size:11px;letter-spacing:1px;font-weight:700;" +
      "background:transparent;color:rgba(0,245,255,0.85);" +
      "border:1px solid rgba(0,245,255,0.45);border-radius:6px;" +
      "cursor:pointer;transition:all 0.18s;";
    editBtn.addEventListener("click", function () { toggleEdit(!editMode); });

    wrap.appendChild(editBtn);
    header.appendChild(wrap);
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
      btn.style.background = editMode ? "rgba(0,245,255,0.18)" : "transparent";
      btn.style.color = editMode ? "#00f5ff" : "rgba(0,245,255,0.85)";
      btn.style.borderColor = editMode ? "#00f5ff" : "rgba(0,245,255,0.45)";
      btn.style.boxShadow = editMode ? "0 0 12px rgba(0,245,255,0.5)" : "none";
    }
    if (!editMode) scheduleSave();
    if (window.QMS && QMS.showToast) {
      QMS.showToast(editMode ? "Edit mode on — tap × to remove" : "Layout saved", editMode ? "info" : "success");
    }
  }

  /* ---------- styles ---------- */
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
      /* red × on pinned tiles */
      ".qa-x{display:none;position:absolute;top:-8px;right:-8px;width:24px;height:24px;border-radius:50%;background:#ff3860;border:2px solid #0a0e1a;color:#fff;font-size:14px;font-weight:900;line-height:1;align-items:center;justify-content:center;cursor:pointer;z-index:10;padding:0;box-shadow:0 0 12px rgba(255,56,96,0.75);transition:transform .15s}",
      ".qa-x:hover{transform:scale(1.2) rotate(90deg)}",
      ".sd-qa-grid[data-edit-mode='1'] .sd-qa-tile[data-pinned='1'] .qa-x{display:flex !important}",
      ".sd-qa-grid[data-edit-mode='1'] .sd-qa-tile[data-pinned='1']{box-shadow:0 0 0 2px rgba(255,56,96,0.55),0 0 20px rgba(255,56,96,0.35) !important}",
      ".sd-qa-grid[data-edit-mode='1']::after{content:'EDIT MODE — tap \\u00D7 to remove, then Done';position:absolute;top:-28px;right:0;font-size:10px;letter-spacing:1.5px;color:#ff3860;font-weight:700;text-shadow:0 0 8px rgba(255,56,96,0.6)}",
      ".sd-qa-grid{position:relative}",
      ".sd-qa-grid[data-pinned-count]::before{content:attr(data-pinned-count) ' / ' attr(data-max-pinned) ' pinned';position:absolute;bottom:-16px;right:0;font-size:10px;letter-spacing:1.5px;opacity:0.5}",
      "@keyframes qaTileIn{from{opacity:0;transform:scale(0.6) rotate(-8deg)}to{opacity:1;transform:scale(1) rotate(0)}}",
      ".sd-qa-tile[data-pinned='1']{animation:qaTileIn 0.35s cubic-bezier(0.34,1.56,0.64,1)}"
    ].join("\n");
    document.head.appendChild(s);
  }

  /* ---------- Sortable wiring ---------- */
  function attachSortables() {
    if (typeof Sortable === "undefined") return;
    var cats = document.querySelector(".sd-cats-grid");
    var qa   = document.querySelector(".sd-qa-grid");
    if (!cats || !qa) return;

    // Categories grid
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

    // Quick Actions grid
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
          // if user drags a pinned tile out to RISE categories or nowhere → unpin
          var code = evt.item.getAttribute("data-cat-code");
          if (code) {
            unpin(code);
            evt.item.remove();
            rerenderPinned();
            window.QMS && QMS.showToast && QMS.showToast("Unpinned", "info");
          }
        },
        onEnd: function () {
          layout.qa = Array.prototype.slice
            .call(qa.querySelectorAll('[data-pinned="1"]'))
            .map(function (t) { return t.getAttribute("data-cat-code"); });
          scheduleSave();
        }
      });
      qa.dataset.sortableAttached = "1";
    }
  }

  /* ---------- main ---------- */
  function attach() {
    var u = window.QMS && window.QMS.state && window.QMS.state.user;
    if (!u || u.role !== "student") return;
    var cats = document.querySelector(".sd-cats-grid");
    var qa   = document.querySelector(".sd-qa-grid");
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
    setTimeout(function () { pending = false; attach(); }, 350);
  }

  function start() {
    injectStyles();
    hydrate().then(scan);
    new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
    console.log("[dash-drag] bidirectional drag + edit mode ready");
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
console.log("[2/3] wrote dash-drag.js (" + dashDrag.length + " bytes)");

/* ============================================================
   3. Patch index.html — add navbar-anim.css link, bump versions
   ============================================================ */
let html = fs.readFileSync("index.html", "utf8");

// Add navbar-anim.css if missing
if (!html.includes("navbar-anim.css")) {
  if (html.includes("</head>")) {
    html = html.replace("</head>", '  <link rel="stylesheet" href="navbar-anim.css?v=1">\n</head>');
    console.log("[3/3] added navbar-anim.css link");
  }
}

// Bump dash-drag version
html = html.replace(/dash-drag\.js\?v=\d+/, "dash-drag.js?v=10");
console.log("[3/3] bumped dash-drag.js to v=10");

fs.writeFileSync("index.html", html, "utf8");

/* Verify */
const arrowOk = html.includes("\u2192");
console.log("Continue arrow present:", arrowOk);
console.log("dash-drag version:", (html.match(/dash-drag\.js\?v=(\d+)/) || [])[1] || "missing");
console.log("navbar-anim linked:", html.includes("navbar-anim.css"));
