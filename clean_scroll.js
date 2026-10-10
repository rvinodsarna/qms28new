const fs = require("fs");
let html = fs.readFileSync("index.html", "utf8");
html = html.replace(/\s*<script[^>]*scroll-nuke[^>]*><\/script>/g, "");
html = html.replace(/\s*<script[^>]*smooth-scroll[^>]*><\/script>/g, "");
html = html.replace(/\s*<script[^>]*scroll-force[^>]*><\/script>/g, "");
fs.writeFileSync("index.html", html, "utf8");
console.log("removed scroll scripts");
console.log("scroll-nuke still present:", html.includes("scroll-nuke"));
console.log("smooth-scroll still present:", html.includes("smooth-scroll"));
