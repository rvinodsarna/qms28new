const fs = require("fs");
const path = "index.html";
let html = fs.readFileSync(path, "utf8");
const before = html;

// 1. Remove gold-shimmer.js script tag
html = html.replace(/<script[^>]*gold-shimmer\.js[^>]*><\/script>\s*/gi, "");

// 2. Remove the inline QMS-GOLD-SHIMMER style block
const START = "<!-- QMS-GOLD-SHIMMER-START -->";
const END   = "<!-- QMS-GOLD-SHIMMER-END -->";
const s = html.indexOf(START);
if (s !== -1) {
  const e = html.indexOf(END, s);
  if (e !== -1) {
    html = html.slice(0, s) + html.slice(e + END.length);
    console.log("✅ Removed inline gold-shimmer style block");
  }
}

// 3. Bump styles.css cache so any lingering CSS rule refreshes
html = html.replace(/styles\.css\?v=\d+/g, "styles.css?v=13");

if (html === before) {
  console.log("ℹ️  Nothing to remove (already clean)");
} else {
  fs.writeFileSync(path, html, "utf8");
  console.log("✅ index.html cleaned");
}