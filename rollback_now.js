const fs = require("fs");

// 1. Remove dash-drag script tag from index.html
let html = fs.readFileSync("index.html", "utf8");
const before = html.length;
html = html.replace(/\s*<script[^>]*dash-drag[^>]*><\/script>/gi, "");
fs.writeFileSync("index.html", html, "utf8");
console.log("removed dash-drag tag:", before !== html.length);
console.log("dash-drag present:", html.includes("dash-drag"));

// 2. Delete dash-drag.js file so it can't be loaded
try { fs.unlinkSync("dash-drag.js"); console.log("deleted dash-drag.js"); } catch(e) {}

// 3. Verify
html = fs.readFileSync("index.html", "utf8");
console.log("final check — dash-drag present:", html.includes("dash-drag"));
