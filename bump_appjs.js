const fs = require("fs");
let html = fs.readFileSync("index.html", "utf8");
const before = html;
const stamp = Date.now().toString().slice(-6);
html = html.replace(/app\.js\?v=\d+/g, "app.js?v=" + stamp);
fs.writeFileSync("index.html", html, "utf8");
console.log("bumped app.js?v=2 -> app.js?v=" + stamp);
console.log("changed:", html !== before);
console.log("matches now:", (html.match(/app\.js\?v=\d+/g) || []).join(", "));
