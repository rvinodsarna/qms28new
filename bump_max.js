const fs = require("fs");
let s = fs.readFileSync("dash-drag.js", "utf8");

const before = s;
s = s.replace(/var MAX_PINNED\s*=\s*\d+;/g, "var MAX_PINNED = 10;");

if (s !== before) {
  fs.writeFileSync("dash-drag.js", s, "utf8");
  console.log("MAX_PINNED set to 10");
} else {
  console.log("pattern not found — current value:");
  const m = s.match(/MAX_PINNED[^;]*/);
  console.log(m ? m[0] : "(not found)");
}

// Bump version
let html = fs.readFileSync("index.html", "utf8");
html = html.replace(/dash-drag\.js\?v=\d+/g, "dash-drag.js?v=13");
fs.writeFileSync("index.html", html, "utf8");
console.log("bumped to v=13");
