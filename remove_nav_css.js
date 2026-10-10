const fs = require("fs");
let html = fs.readFileSync("index.html", "utf8");

const before = html.length;
// Remove the stylesheet link
html = html.replace(/\s*<link[^>]*navbar-anim\.css[^>]*>/g, "");
const after = html.length;

fs.writeFileSync("index.html", html, "utf8");
console.log("removed", before - after, "chars from index.html");
console.log("still references navbar-anim:", html.includes("navbar-anim"));
