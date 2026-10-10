const fs = require("fs");

/* ═══════ 1. Green laser on school name (inline CSS) ═══════ */
let html = fs.readFileSync("index.html", "utf8");
html = html.replace(/<style id="school-laser">[\s\S]*?<\/style>/g, "");

const laserCSS = '<style id="school-laser">' +
  '.topbar-school, .topbar-logo-sub, .school-name, ' +
  '.topbar-subtitle, .sidebar-school-name, .app-school-name {' +
    'background:linear-gradient(90deg,#00ff88 0%,#7dffb0 25%,#00ff88 50%,#00c46a 75%,#00ff88 100%) !important;' +
    'background-size:300% 100% !important;' +
    '-webkit-background-clip:text !important;background-clip:text !important;' +
    '-webkit-text-fill-color:transparent !important;color:transparent !important;' +
    'animation:navLaser 2.4s linear infinite !important;' +
    'text-shadow:0 0 12px rgba(0,255,136,0.55),0 0 24px rgba(0,255,136,0.25) !important;' +
    'font-weight:700 !important;letter-spacing:0.05em !important;' +
  '}' +
  '@keyframes navLaser{0%{background-position:0% 50%}100%{background-position:300% 50%}}' +
  '</style>\n</head>';

html = html.replace("</head>", laserCSS);
console.log("[1] green laser CSS added");

/* ═══════ 2. Re-link AI chat (files already exist) ═══════ */
if (!html.includes("styles-ai-chat.css")) {
  html = html.replace("</head>", '  <link rel="stylesheet" href="styles-ai-chat.css?v=6">\n</head>');
  console.log("[2a] linked styles-ai-chat.css");
}
if (!html.includes("ai-chat.js")) {
  html = html.replace("</body>", '  <script src="ai-chat.js?v=7" defer></script>\n</body>');
  console.log("[2b] linked ai-chat.js");
} else {
  html = html.replace(/ai-chat\.js\?v=\d+/g, "ai-chat.js?v=7");
  console.log("[2b] bumped ai-chat.js to v=7");
}

/* ═══════ 3. Re-link dash-drag.js (will create file next) ═══════ */
if (!html.includes("dash-drag.js")) {
  html = html.replace("</body>", '  <script src="dash-drag.js?v=21" defer></script>\n</body>');
  console.log("[3] linked dash-drag.js");
}

fs.writeFileSync("index.html", html, "utf8");
console.log("index.html saved");

/* ═══════ 4. Write minimal SAFE dash-drag.js ═══════ */
const dashDrag = [
'/* dash-drag.js v21 — MINIMAL. No MutationObserver. SetInterval with hard limit. */',
'(function(){',
'  if (window.__ddv21) return; window.__ddv21 = true;',
'',
'  var LS = "qms.dd.v21";',
'  var FIXED = [',
'    { icon: "\\uD83C\\uDF93", code: "academic-support", route: "academic-support", cls: "qa-green",   display: "Academic Support" },',
'    { icon: "\\uD83D\\uDCC8", code: "my-progress",      route: "my-progress",      cls: "qa-magenta", display: "My Progress" },',
'    { icon: "\\uD83D\\uDCC5", code: "timetable",        route: "timetable",        cls: "qa-cyan",    display: "Timetable" },',
'    { icon: "\\uD83D\\uDCDA", code: "study-plan",       route: "study-plan",       cls: "qa-violet",  display: "Study Plan" }',
'  ];',
'  var CAT = {',
'    "Attendance":          { icon: "\\uD83D\\uDCC5", code: "attendance",        route: "qr-scanner",        cls: "qa-cyan",    display: "Attendance" },',
'    "Evaluation":          { icon: "\\uD83D\\uDCDD", code: "evaluation",        route: "evaluation",        cls: "qa-violet",  display: "Evaluation" },',
'    "Quiz Battle":         { icon: "\\u26A1",        code: "quiz",              route: "quiz",              cls: "qa-magenta", display: "Quiz Battle" },',
'    "Bonus":               { icon: "\\uD83C\\uDFAF", code: "bonus",             route: "bonus",             cls: "qa-gold",    display: "Bonus" },',
'    "Clubs & Roles":       { icon: "\\uD83C\\uDFDB", code: "positions",         route: "student-clubs",     cls: "qa-green",   display: "Clubs & Roles" },',
'    "Streak":              { icon: "\\uD83D\\uDD25", code: "streak",            route: "my-progress",       cls: "qa-magenta", display: "Streak" },',
'    "Workshops & Talks":   { icon: "\\uD83C\\uDF93", code: "workshops",         route: "events",            cls: "qa-violet",  display: "Workshops & Talks" },',
'    "Competitions":        { icon: "\\uD83C\\uDFC6", code: "competitions",      route: "events",            cls: "qa-green",   display: "Competitions" },',
'    "Coursera":            { icon: "\\uD83D\\uDCD8", code: "coursera",          route: "certificates",      cls: "qa-cyan",    display: "Coursera" },',
'    "Award & Recognition": { icon: "\\uD83C\\uDFC5", code: "award_recognition", route: "award-recognition", cls: "qa-gold",    display: "Award & Recognition" }',
'  };',
'',
'  var layout = { pinned: [] };',
'  var editMode = false;',
'  var attached = false;',
'',
'  function load(){ try { return JSON.parse(localStorage.getItem(LS)||"{}")||{}; } catch(e){ return {}; } }',
'  function save(){ try { localStorage.setItem(LS, JSON.stringify(layout)); } catch(e){} }',
'  function findMeta(c){ for (var k in CAT) if (CAT[k].code === c) return CAT[k]; return null; }',
'  function catLabel(el){',
'    var n = el.querySelector(".sd-cat-name"); if (!n) return "";',
'    var c = n.cloneNode(true); var b = c.querySelector(".sd-cat-icon-badge"); if (b) b.remove();',
'    return c.textContent.replace(/\\s+/g," ").trim();',
'  }',
'',
'  function rerender(){',
'    var qa = document.querySelector(".sd-qa-grid"); if (!qa) return;',
'    qa.innerHTML = "";',
'    FIXED.forEach(function(m){',
'      var b = document.createElement("button");',
'      b.type = "button"; b.className = "sd-qa-tile " + m.cls;',
'      b.setAttribute("data-fixed","1"); b.setAttribute("data-cat-code", m.code);',
'      b.style.position = "relative";',
'      b.innerHTML = \'<span class="sd-qa-icon-badge" style="font-size:20px;">\' + m.icon + \'</span><span class="qa-label">\' + m.display + \'</span>\';',
'      b.onclick = function(e){ if (editMode) { e.preventDefault(); return; } if (m.route && window.navigate) window.navigate(m.route); };',
'      qa.appendChild(b);',
'    });',
'    layout.pinned.forEach(function(code){',
'      if (FIXED.some(function(m){ return m.code === code; })) return;',
'      var m = findMeta(code); if (!m) return;',
'      var b = document.createElement("button");',
'      b.type = "button"; b.className = "sd-qa-tile " + m.cls;',
'      b.setAttribute("data-pinned","1"); b.setAttribute("data-cat-code", code);',
'      b.style.position = "relative";',
'      b.innerHTML = \'<span class="qa-x" title="Remove">\\u00D7</span><span class="sd-qa-icon-badge" style="font-size:20px;">\' + m.icon + \'</span><span class="qa-label">\' + m.display + \'</span>\';',
'      b.querySelector(".qa-x").onclick = function(e){',
'        e.preventDefault(); e.stopPropagation();',
'        if (!editMode) return;',
'        qmsConfirm(m.display, function(){',
'          layout.pinned = layout.pinned.filter(function(c){ return c !== code; });',
'          save(); rerender();',
'        });',
'      };',
'      b.onclick = function(e){ if (editMode) { e.preventDefault(); return; } if (m.route && window.navigate) window.navigate(m.route); };',
'      qa.appendChild(b);',
'    });',
'    qa.setAttribute("data-edit-mode", editMode ? "1" : "0");',
'    qa.setAttribute("data-pinned-count", String(layout.pinned.length));',
'  }',
'',
'  function qmsConfirm(name, cb){',
'    var old = document.getElementById("qms-confirm-modal"); if (old) old.remove();',
'    var ov = document.createElement("div");',
'    ov.id = "qms-confirm-modal";',
'    ov.style.cssText = "position:fixed;inset:0;z-index:9999999;background:rgba(6,8,16,0.8);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;";',
'    ov.innerHTML = \'<div style="width:90%;max-width:420px;padding:28px 26px 22px;background:linear-gradient(160deg,rgba(12,16,32,0.98),rgba(8,10,24,0.99));border:1px solid rgba(0,245,255,0.35);border-radius:18px;box-shadow:0 24px 80px rgba(0,0,0,0.7),0 0 40px rgba(0,245,255,0.18);color:#eafcff;font-family:system-ui,sans-serif;"><div style="display:flex;align-items:center;gap:14px;margin-bottom:14px;"><div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,rgba(0,245,255,0.18),rgba(124,58,237,0.18));border:1px solid rgba(0,245,255,0.5);display:flex;align-items:center;justify-content:center;font-size:20px;">\\u2139\\uFE0F</div><div><div style="font-size:16px;font-weight:800;background:linear-gradient(90deg,#00f5ff,#7c3aed);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;">Remove from Quick Actions?</div><div style="font-size:11px;letter-spacing:1.5px;opacity:0.6;margin-top:3px;color:#00f5ff;">QMS RISE \\u2014 CONFIRM</div></div></div><div style="font-size:13.5px;line-height:1.6;opacity:0.85;margin-bottom:22px;color:#c8e8f0;">Remove <strong style="color:#00f5ff">\' + name + \'</strong> from Quick Actions?</div><div style="display:flex;gap:10px;justify-content:flex-end;"><button id="qms-cancel" style="padding:10px 22px;border-radius:10px;background:rgba(255,255,255,0.05);color:#b6d8e0;border:1px solid rgba(255,255,255,0.18);font-size:12px;font-weight:700;letter-spacing:1.2px;cursor:pointer;">CANCEL</button><button id="qms-remove" style="padding:10px 22px;border-radius:10px;background:linear-gradient(135deg,#00f5ff,#7c3aed);color:#001a1f;border:none;font-size:12px;font-weight:800;letter-spacing:1.2px;cursor:pointer;box-shadow:0 0 22px rgba(0,245,255,0.55);">CONFIRM</button></div></div>\';',
'    document.body.appendChild(ov);',
'    function close(){ ov.remove(); }',
'    ov.querySelector("#qms-cancel").onclick = close;',
'    ov.onclick = function(e){ if (e.target === ov) close(); };',
'    ov.querySelector("#qms-remove").onclick = function(){ close(); cb(); };',
'  }',
'',
'  function injectEditBtn(){',
'    var qa = document.querySelector(".sd-qa-grid"); if (!qa) return;',
'    var card = qa.closest(".glass-card"); if (!card) return;',
'    var header = card.querySelector(".card-header"); if (!header) return;',
'    if (header.querySelector(".qa-edit-btn")) return;',
'    header.style.display = "flex"; header.style.justifyContent = "space-between"; header.style.alignItems = "center";',
'    var b = document.createElement("button");',
'    b.type = "button"; b.className = "qa-edit-btn";',
'    b.textContent = editMode ? "Done \\u2713" : "Edit";',
'    b.style.cssText = "padding:6px 16px;font-size:11px;letter-spacing:1.5px;font-weight:800;background:rgba(0,245,255,0.08);color:#00f5ff;border:1px solid rgba(0,245,255,0.6);border-radius:8px;cursor:pointer;margin-left:auto;";',
'    b.onclick = function(){ toggleEdit(!editMode); };',
'    header.appendChild(b);',
'  }',
'',
'  function toggleEdit(on){',
'    editMode = !!on;',
'    var btn = document.querySelector(".qa-edit-btn");',
'    if (btn) {',
'      btn.textContent = editMode ? "Done \\u2713" : "Edit";',
'      btn.style.background = editMode ? "rgba(0,245,255,0.28)" : "rgba(0,245,255,0.08)";',
'      btn.style.color = editMode ? "#001a1f" : "#00f5ff";',
'    }',
'    var qa = document.querySelector(".sd-qa-grid");',
'    if (qa) qa.setAttribute("data-edit-mode", editMode ? "1" : "0");',
'    document.querySelectorAll(".qa-x").forEach(function(x){ x.style.display = editMode ? "flex" : "none"; });',
'  }',
'',
'  function injectStyles(){',
'    if (document.getElementById("dash-drag-styles")) return;',
'    var s = document.createElement("style");',
'    s.id = "dash-drag-styles";',
'    s.textContent = \'.sd-qa-tile{position:relative !important;cursor:grab !important}.sd-qa-tile:hover{box-shadow:0 0 0 1px rgba(0,245,255,0.5),0 8px 24px rgba(0,245,255,0.28) !important}.qa-x{display:none;position:absolute;top:-8px;right:-8px;width:26px;height:26px;border-radius:50%;background:#ff3860;border:2px solid #0a0e1a;color:#fff;font-size:16px;font-weight:900;line-height:1;align-items:center;justify-content:center;cursor:pointer;z-index:999;padding:0;box-shadow:0 0 14px rgba(255,56,96,0.85);}.qa-x:hover{transform:scale(1.2)}.sd-qa-grid[data-edit-mode=\\\'1\\\'] .sd-qa-tile[data-pinned=\\\'1\\\'] .qa-x{display:flex !important}.sd-qa-grid[data-edit-mode=\\\'1\\\'] .sd-qa-tile[data-pinned=\\\'1\\\']{box-shadow:0 0 0 2px rgba(255,56,96,0.65) !important}\';',
'    document.head.appendChild(s);',
'  }',
'',
'  function attach(){',
'    var u = window.QMS && window.QMS.state && window.QMS.state.user;',
'    if (!u || u.role !== "student") return;',
'    var qa = document.querySelector(".sd-qa-grid");',
'    var cats = document.querySelector(".sd-cats-grid");',
'    if (!qa || !cats) return;',
'    document.body.setAttribute("data-drag-ready", "1");',
'    injectStyles();',
'    injectEditBtn();',
'    if (attached) return;',
'    attached = true;',
'    rerender();',
'    if (typeof Sortable !== "undefined") {',
'      try {',
'        Sortable.create(cats, {',
'          animation: 180, delay: 100, delayOnTouchOnly: true,',
'          ghostClass: "sd-cat-ghost", chosenClass: "sd-cat-chosen",',
'          group: { name: "dash", pull: "clone", put: false }',
'        });',
'        Sortable.create(qa, {',
'          animation: 180, delay: 100, delayOnTouchOnly: true,',
'          ghostClass: "sd-qa-ghost", chosenClass: "sd-qa-chosen",',
'          group: { name: "dash", pull: false, put: true },',
'          onAdd: function(evt){',
'            var label = catLabel(evt.clone || evt.item);',
'            var meta = CAT[label];',
'            var item = evt.item;',
'            if (!meta) { item.remove(); return; }',
'            if (FIXED.some(function(m){ return m.code === meta.code; })) { item.remove(); return; }',
'            if (layout.pinned.indexOf(meta.code) !== -1) { item.remove(); return; }',
'            if (layout.pinned.length >= 10) { item.remove(); return; }',
'            layout.pinned.push(meta.code);',
'            save();',
'            item.remove();',
'            rerender();',
'          }',
'        });',
'      } catch(e){ console.warn("[dd] sortable:", e); }',
'    }',
'  }',
'',
'  function boot(){',
'    layout = load();',
'    if (!layout.pinned) layout.pinned = [];',
'    var tries = 0;',
'    var iv = setInterval(function(){',
'      attach();',
'      if (++tries > 40) clearInterval(iv);',
'    }, 300);',
'  }',
'',
'  if (typeof window.navigate === "function" && !window.__ddNav) {',
'    var orig = window.navigate;',
'    window.navigate = function(r){',
'      var x = orig.apply(this, arguments);',
'      if (r === "dashboard") { attached = false; setTimeout(attach, 900); }',
'      return x;',
'    };',
'    window.__ddNav = true;',
'  }',
'',
'  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);',
'  else boot();',
'',
'  console.log("[dash-drag] v21 ready");',
'})();'
].join("\n");

fs.writeFileSync("dash-drag.js", dashDrag, "utf8");
console.log("[4] dash-drag.js written (" + fs.statSync("dash-drag.js").size + " bytes)");