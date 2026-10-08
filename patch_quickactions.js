const fs = require("fs");
let s = fs.readFileSync("dash-drag.js", "utf8");

/* ============ 1. Add FIXED tiles array ============ */
if (!s.includes("FIXED_TILES")) {
  const anchor = "var CAT_META = {";
  const fixedBlock = `var FIXED_TILES = [
    { icon: "\\uD83D\\uDCC5", code: "timetable",        route: "timetable",         cls: "qa-cyan",    display: "Timetable" },
    { icon: "\\uD83D\\uDCDA", code: "study-plan",       route: "study-plan",        cls: "qa-violet",  display: "Study Plan" },
    { icon: "\\uD83C\\uDF93", code: "academic-support", route: "academic-support",  cls: "qa-green",   display: "Academic Support" },
    { icon: "\\uD83D\\uDCC8", code: "my-progress",      route: "my-progress",       cls: "qa-magenta", display: "My Progress" }
  ];

  var CAT_META = {`;
  s = s.replace(anchor, fixedBlock);
  console.log("[1] added FIXED_TILES");
} else {
  console.log("[1] FIXED_TILES already present");
}

/* ============ 2. Replace rerenderPinned with fixed-tile-aware version ============ */
const oldRerender = /function rerenderPinned\(\) \{[\s\S]*?\n  \}/;
const newRerender = `function rerenderPinned() {
    var qa = document.querySelector(".sd-qa-grid");
    if (!qa) return;

    // Remove all previously injected tiles (fixed + pinned)
    qa.querySelectorAll('[data-pinned="1"], [data-fixed="1"]').forEach(function (el) { el.remove(); });

    // 1) Fixed tiles first — no x button, always present
    FIXED_TILES.forEach(function (meta) {
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

    // 2) User-pinned tiles after fixed
    var fixedCodes = FIXED_TILES.map(function (m) { return m.code; });
    layout.pinned.forEach(function (code) {
      if (fixedCodes.indexOf(code) !== -1) return; // fixed tiles never duplicate
      var meta = metaByCode(code);
      if (!meta) return;
      qa.appendChild(buildTile(meta));
    });

    qa.setAttribute("data-pinned-count", String(layout.pinned.filter(function (c) { return fixedCodes.indexOf(c) === -1; }).length));
    qa.setAttribute("data-max-pinned", String(MAX_PINNED));
    qa.setAttribute("data-edit-mode", editMode ? "1" : "0");
  }`;
if (oldRerender.test(s)) {
  s = s.replace(oldRerender, newRerender);
  console.log("[2] replaced rerenderPinned");
}

/* ============ 3. Block duplicates when pinning ============ */
const oldPin = /function pin\(code\) \{[\s\S]*?\n  \}/;
const newPin = `function pin(code) {
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
  }`;
if (oldPin.test(s)) {
  s = s.replace(oldPin, newPin);
  console.log("[3] replaced pin");
}

/* ============ 4. Add QMS-styled confirm modal + replace window.confirm usage ============ */
if (!s.includes("__qmsConfirm")) {
  // Insert modal function before `function buildTile` or similar
  const modalCode = `
  /* ---------- QMS-styled confirm modal ---------- */
  function qmsConfirm(message, onConfirm) {
    var existing = document.getElementById("qms-confirm-modal");
    if (existing) existing.remove();

    var overlay = document.createElement("div");
    overlay.id = "qms-confirm-modal";
    overlay.style.cssText =
      "position:fixed;inset:0;z-index:9999999;" +
      "background:rgba(6,8,16,0.75);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);" +
      "display:flex;align-items:center;justify-content:center;" +
      "animation:qmsFadeIn 0.2s ease;";

    var box = document.createElement("div");
    box.style.cssText =
      "width:90%;max-width:420px;padding:28px 26px 22px;" +
      "background:linear-gradient(160deg,rgba(12,16,32,0.98),rgba(8,10,24,0.99));" +
      "border:1px solid rgba(0,245,255,0.35);border-radius:18px;" +
      "box-shadow:0 24px 80px rgba(0,0,0,0.7),0 0 40px rgba(0,245,255,0.15);" +
      "font-family:system-ui,-apple-system,sans-serif;color:#eafcff;" +
      "animation:qmsSlideUp 0.3s cubic-bezier(0.34,1.56,0.64,1);";

    box.innerHTML =
      '<div style="display:flex;align-items:center;gap:14px;margin-bottom:14px;">' +
        '<div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#ff3860,#ff6b35);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;box-shadow:0 0 20px rgba(255,56,96,0.5);">\u26A0\uFE0F</div>' +
        '<div>' +
          '<div style="font-size:16px;font-weight:800;letter-spacing:0.4px;">Remove from Quick Actions?</div>' +
          '<div style="font-size:12px;opacity:0.6;margin-top:3px;">QMS RISE \u2014 Confirm action</div>' +
        '</div>' +
      '</div>' +
      '<div style="font-size:13.5px;line-height:1.6;opacity:0.85;margin-bottom:22px;padding-left:2px;">' + message + '</div>' +
      '<div style="display:flex;gap:10px;justify-content:flex-end;">' +
        '<button id="qms-cancel" style="padding:10px 22px;border-radius:10px;background:rgba(255,255,255,0.05);color:#b6d8e0;border:1px solid rgba(255,255,255,0.15);font-size:13px;font-weight:700;letter-spacing:1px;cursor:pointer;transition:all .15s;">CANCEL</button>' +
        '<button id="qms-remove" style="padding:10px 22px;border-radius:10px;background:linear-gradient(135deg,#ff3860,#ff6b35);color:#fff;border:none;font-size:13px;font-weight:800;letter-spacing:1px;cursor:pointer;box-shadow:0 0 18px rgba(255,56,96,0.5);transition:all .15s;">REMOVE</button>' +
      '</div>';

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    // Animations
    if (!document.getElementById("qms-modal-anim")) {
      var st = document.createElement("style");
      st.id = "qms-modal-anim";
      st.textContent =
        "@keyframes qmsFadeIn{from{opacity:0}to{opacity:1}}" +
        "@keyframes qmsSlideUp{from{opacity:0;transform:translateY(20px) scale(0.95)}to{opacity:1;transform:translateY(0) scale(1)}}";
      document.head.appendChild(st);
    }

    function close() { overlay.remove(); }
    document.getElementById("qms-cancel").addEventListener("click", close);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
    document.addEventListener("keydown", function esc(e) {
      if (e.key === "Escape") { close(); document.removeEventListener("keydown", esc); }
    });
    document.getElementById("qms-remove").addEventListener("click", function () {
      close();
      onConfirm();
    });
  }
  window.__qmsConfirm = qmsConfirm;

`;
  // Insert before `function buildTile(`
  const anchor = "function buildTile(meta) {";
  if (s.includes(anchor)) {
    s = s.replace(anchor, modalCode + anchor);
    console.log("[4] added qmsConfirm modal");
  }
}

/* ============ 5. Replace window.confirm in the x-button handler ============ */
const oldX = /btn\.querySelector\("\.qa-x"\)\.addEventListener\("click", function \(e\) \{[\s\S]*?\n    \}\);/;
const newX = `btn.querySelector(".qa-x").addEventListener("click", function (e) {
      e.preventDefault(); e.stopPropagation();
      if (!editMode) return;
      window.__qmsConfirm("Are you sure you want to remove <strong style='color:#00f5ff'>" + (meta.display || meta.code) + "</strong> from Quick Actions?<br/><br/><span style='font-size:11.5px;opacity:0.55'>You can pin it again anytime by dragging the card from RISE Categories.</span>", function () {
        unpin(meta.code);
        rerenderPinned();
        window.QMS && QMS.showToast && QMS.showToast("Removed " + meta.display, "success");
      });
    });`;
if (oldX.test(s)) {
  s = s.replace(oldX, newX);
  console.log("[5] replaced window.confirm with QMS modal");
}

/* ============ 6. Update attachSortables to block fixed tiles ============ */
s = s.replace(
  /onRemove: function \(evt\) \{[\s\S]*?\n        \}/,
  `onRemove: function (evt) {
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
        }`
);

/* ============ 7. Styles: fixed tile badge ============ */
if (!s.includes("data-fixed='1']::after")) {
  s = s.replace(
    `".sd-qa-grid[data-edit-mode='1']::after`,
    `".sd-qa-tile[data-fixed='1']::after{content:'FIXED';position:absolute;top:-6px;left:-6px;padding:2px 6px;font-size:8px;letter-spacing:1px;font-weight:800;background:rgba(0,245,255,0.2);color:#00f5ff;border:1px solid rgba(0,245,255,0.5);border-radius:4px;text-shadow:0 0 6px rgba(0,245,255,0.6)}",
      ".sd-qa-tile[data-fixed='1']{cursor:default !important}",
      ".sd-qa-grid[data-edit-mode='1']::after`
  );
  console.log("[7] added FIXED badge style");
}

fs.writeFileSync("dash-drag.js", s, "utf8");
console.log("wrote dash-drag.js (" + fs.statSync("dash-drag.js").size + " bytes)");

/* ============ 8. Bump version in index.html ============ */
let html = fs.readFileSync("index.html", "utf8");
const before = html;
html = html.replace(/dash-drag\.js\?v=\d+/g, "dash-drag.js?v=12");
fs.writeFileSync("index.html", html, "utf8");
console.log("[8] bumped dash-drag to v=12:", html !== before);
