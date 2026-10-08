const fs = require("fs");

// 1. Delete every scroll-related file I added
["smooth-scroll.js","scroll-nuke.js","scroll-force.js","drag-scroll.js"].forEach(f => {
  try { fs.unlinkSync(f); console.log("deleted:", f); } catch (e) {}
});

// 2. Empty the scroll CSS (keep the file so the link doesn't 404, but make it do nothing)
fs.writeFileSync("styles-scroll-fix.css", "/* reset - no overrides */\n", "utf8");
console.log("cleared styles-scroll-fix.css");

// 3. Clean index.html — remove all my scroll scripts and the scroll-helper buttons
let html = fs.readFileSync("index.html", "utf8");
const before = html.length;

// remove script tags
html = html.replace(/\s*<script[^>]*(smooth-scroll|scroll-nuke|scroll-force|drag-scroll)[^>]*><\/script>/gi, "");

// remove the scroll-helper block (from <!-- scroll-helper: ... --> through the closing </script> of it)
html = html.replace(/<!--\s*scroll-helper[\s\S]*?<\/script>/gi, "");

fs.writeFileSync("index.html", html, "utf8");
console.log("index.html trimmed by", before - html.length, "chars");
console.log("smooth-scroll still in html:", html.includes("smooth-scroll"));
console.log("scroll-nuke still in html:", html.includes("scroll-nuke"));
console.log("scroll-helper still in html:", html.includes("scroll-helper"));
