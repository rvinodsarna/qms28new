const fs = require("fs");

// 1. Delete the offending scripts from disk
["smooth-scroll.js", "scroll-nuke.js", "scroll-force.js", "ai-chat-ultimate.js"].forEach(f => {
  try { fs.unlinkSync(f); console.log("deleted:", f); } catch (e) { console.log("skip:", f); }
});

// 2. Remove their tags from index.html
let html = fs.readFileSync("index.html", "utf8");
const before = html.length;
html = html.replace(/\s*<script[^>]*(smooth-scroll|scroll-nuke|scroll-force|ai-chat-ultimate)[^>]*><\/script>/gi, "");
fs.writeFileSync("index.html", html, "utf8");
console.log("removed", before - html.length, "chars of script tags");
console.log("smooth-scroll still there:", html.includes("smooth-scroll"));
console.log("scroll-nuke still there:", html.includes("scroll-nuke"));
console.log("ai-chat-ultimate still there:", html.includes("ai-chat-ultimate"));
