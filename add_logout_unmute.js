const fs = require("fs");
let html = fs.readFileSync("index.html", "utf8");

if (html.includes("logout-unmute")) {
  console.log("already present");
  process.exit(0);
}

const anchor = html.match(/<script[^>]*app-extra\.js[^>]*><\/script>/);

if (!anchor) {
  console.log("anchor app-extra.js not found — showing all script tags:");
  console.log((html.match(/<script[^>]*src="[^"]*"[^>]*><\/script>/g) || []).join("\n"));
  process.exit(1);
}

const newTag = anchor[0] + '\n  <script src="logout-unmute.js?v=3" defer></script>';
html = html.replace(anchor[0], newTag);

fs.writeFileSync("index.html", html, "utf8");
console.log("added logout-unmute.js after app-extra.js");
console.log("verify:", html.includes("logout-unmute.js?v=3"));
