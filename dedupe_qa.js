const fs = require("fs");
let s = fs.readFileSync("dash-drag.js", "utf8");

// Find rerenderPinned and rewrite it to dedupe by code
const oldFn = /function rerenderPinned\(\) \{[\s\S]*?\n  \}/;
const newFn = `function rerenderPinned() {
    var qa = document.querySelector(".sd-qa-grid");
    if (!qa) return;

    // Remove all our injected tiles
    qa.querySelectorAll('[data-pinned="1"], [data-fixed="1"]').forEach(function (el) { el.remove(); });

    // What categories already exist from app.js? (QR Attendance, Quiz Battle, etc.)
    var existing = {};
    Array.from(qa.querySelectorAll(".sd-qa-tile")).forEach(function (tile) {
      var label = tile.textContent.replace(/\\s+/g, " ").trim().toLowerCase();
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
  }`;

if (oldFn.test(s)) {
  s = s.replace(oldFn, newFn);
  console.log("rerenderPinned rewritten with dedupe");
} else {
  console.log("WARN: rerenderPinned pattern not found");
}

fs.writeFileSync("dash-drag.js", s, "utf8");

// Bump version
let html = fs.readFileSync("index.html", "utf8");
html = html.replace(/dash-drag\.js\?v=\d+/g, "dash-drag.js?v=14");
fs.writeFileSync("index.html", html, "utf8");
console.log("bumped to v=14");
