const fs = require("fs");
let html = fs.readFileSync("index.html", "utf8");
const before = html.length;
html = html.replace(/\s*<script[^>]*dash-drag[^>]*><\/script>/gi, "");
fs.writeFileSync("index.html", html, "utf8");
console.log("removed dash-drag:", before !== html.length);
console.log("dash-drag present:", html.includes("dash-drag"));
