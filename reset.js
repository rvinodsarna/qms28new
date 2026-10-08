const fs = require("fs");
let html = fs.readFileSync("index.html", "utf8");
const before = html.length;

// Remove ALL my custom scripts and CSS from index.html
const patterns = [
  /\s*<link[^>]*anti-flash[^>]*>/gi,
  /\s*<link[^>]*styles-scroll-fix[^>]*>/gi,
  /\s*<link[^>]*styles-ai-chat[^>]*>/gi,
  /\s*<link[^>]*navbar-anim[^>]*>/gi,
  /\s*<script[^>]*dash-order[^>]*><\/script>/gi,
  /\s*<script[^>]*dash-drag[^>]*><\/script>/gi,
  /\s*<script[^>]*rise-heading[^>]*><\/script>/gi,
  /\s*<script[^>]*dashboard-spacing[^>]*><\/script>/gi,
  /\s*<script[^>]*dashboard-extras[^>]*><\/script>/gi,
  /\s*<script[^>]*rise-caps[^>]*><\/script>/gi
];

for (const p of patterns) {
  html = html.replace(p, "");
}

fs.writeFileSync("index.html", html, "utf8");
console.log("trimmed", before - html.length, "chars from index.html");
console.log("dash-order still linked:", html.includes("dash-order"));
console.log("dash-drag still linked:", html.includes("dash-drag"));
console.log("rise-heading still linked:", html.includes("rise-heading"));
console.log("anti-flash still linked:", html.includes("anti-flash"));

// Delete the files too
["anti-flash.css","dash-order.js","rise-heading.js","dashboard-spacing.js"].forEach(f => {
  try { fs.unlinkSync(f); console.log("deleted:", f); } catch(e) {}
});
