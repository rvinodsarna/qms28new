const fs = require("fs");

/* 1. Create anti-flash CSS */
const css = `/* anti-flash.css — hide dashboard grids until scripts finish building them */
.sd-cats-grid:not([data-ready="1"]),
.sd-qa-grid:not([data-ready="1"]) {
  opacity: 0 !important;
  transform: translateY(6px);
  transition: opacity 0.25s ease, transform 0.25s ease;
  pointer-events: none;
}
.sd-cats-grid[data-ready="1"],
.sd-qa-grid[data-ready="1"] {
  opacity: 1 !important;
  transform: translateY(0);
  transition: opacity 0.3s ease, transform 0.3s ease;
}
/* Fade in RISE Categories panel too */
.rise-categories-panel:not([data-ready="1"]) {
  opacity: 0 !important;
  transition: opacity 0.25s ease;
}
.rise-categories-panel[data-ready="1"] {
  opacity: 1 !important;
}
`;
fs.writeFileSync("anti-flash.css", css, "utf8");
console.log("wrote anti-flash.css");

/* 2. Link it in index.html */
let html = fs.readFileSync("index.html", "utf8");
if (!html.includes("anti-flash.css")) {
  html = html.replace("</head>", '  <link rel="stylesheet" href="anti-flash.css?v=1">\n</head>');
  console.log("linked anti-flash.css");
} else {
  html = html.replace(/anti-flash\.css\?v=\d+/g, "anti-flash.css?v=1");
  console.log("bumped anti-flash.css");
}
fs.writeFileSync("index.html", html, "utf8");

/* 3. Patch dash-drag.js to mark grids ready */
let dd = fs.readFileSync("dash-drag.js", "utf8");
const beforeDD = dd;

// In rerenderPinned — add data-ready
dd = dd.replace(
  /qa\.setAttribute\("data-edit-mode", editMode \? "1" : "0"\);/g,
  'qa.setAttribute("data-edit-mode", editMode ? "1" : "0");\n    qa.setAttribute("data-ready", "1");'
);

// Also mark cats grid ready after attach
dd = dd.replace(
  /cats\.dataset\.sortableAttached = "1";/g,
  'cats.dataset.sortableAttached = "1";\n      cats.setAttribute("data-ready", "1");'
);

if (dd !== beforeDD) {
  fs.writeFileSync("dash-drag.js", dd, "utf8");
  console.log("patched dash-drag.js — sets data-ready");
} else {
  console.log("WARN: dash-drag patterns not found");
}

// Bump dash-drag
html = fs.readFileSync("index.html", "utf8");
html = html.replace(/dash-drag\.js\?v=\d+/g, "dash-drag.js?v=18");
fs.writeFileSync("index.html", html, "utf8");
console.log("bumped dash-drag to v=18");

/* 4. Patch rise-heading.js to mark panel ready */
let rh = fs.readFileSync("rise-heading.js", "utf8");
if (rh.includes("rise-categories-panel")) {
  rh = rh.replace(
    /console\.log\("\[rise-panel\] built"\);/,
    'panel.setAttribute("data-ready", "1");\n    console.log("[rise-panel] built");'
  );
  fs.writeFileSync("rise-heading.js", rh, "utf8");
  console.log("patched rise-heading.js");
}

// Bump rise-heading
html = fs.readFileSync("index.html", "utf8");
html = html.replace(/rise-heading\.js\?v=\d+/g, "rise-heading.js?v=3");
fs.writeFileSync("index.html", html, "utf8");
console.log("bumped rise-heading to v=3");
