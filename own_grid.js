const fs = require("fs");
let s = fs.readFileSync("dash-drag.js", "utf8");

// Replace rerenderPinned with a version that fully owns the grid
const oldFn = /function rerenderPinned\(\) \{[\s\S]*?\n  \}/;
const newFn = `function rerenderPinned() {
    var qa = document.querySelector(".sd-qa-grid");
    if (!qa) return;

    // Wipe the grid completely — we own it
    qa.innerHTML = "";

    var rendered = {};

    // 1) Fixed tiles first, in order
    FIXED_TILES.forEach(function (meta) {
      if (rendered[meta.code]) return;
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

    // 2) User-pinned tiles after fixed
    layout.pinned.forEach(function (code) {
      if (rendered[code]) return;
      var meta = metaByCode(code);
      if (!meta) return;
      // Skip if user tried to pin a fixed tile
      var isFixed = FIXED_TILES.some(function (m) { return m.code === code; });
      if (isFixed) return;
      rendered[code] = 1;
      qa.appendChild(buildTile(meta));
    });

    var userCount = 0;
    layout.pinned.forEach(function (c) {
      var isFixed = FIXED_TILES.some(function (m) { return m.code === c; });
      if (!isFixed && metaByCode(c)) userCount++;
    });
    qa.setAttribute("data-pinned-count", String(userCount));
    qa.setAttribute("data-max-pinned", String(MAX_PINNED));
    qa.setAttribute("data-edit-mode", editMode ? "1" : "0");
  }`;

if (oldFn.test(s)) {
  s = s.replace(oldFn, newFn);
  console.log("rerenderPinned now owns the grid (no app.js defaults)");
} else {
  console.log("WARN: rerenderPinned pattern not found");
}

fs.writeFileSync("dash-drag.js", s, "utf8");

// Bump version
let html = fs.readFileSync("index.html", "utf8");
html = html.replace(/dash-drag\.js\?v=\d+/g, "dash-drag.js?v=17");
fs.writeFileSync("index.html", html, "utf8");
console.log("bumped to v=17");
