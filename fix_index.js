const fs = require("fs");
const path = "index.html";
let html = fs.readFileSync(path, "utf8");

console.log("File loaded. length:", html.length);
const i0 = html.indexOf("Continue");
console.log("Before fix:", JSON.stringify(html.slice(i0, i0 + 40)));

/* ---------- 1. Fix any mojibake in Continue arrow & comment dividers ---------- */
html = html.replace(/Continue&nbsp;[^<]{1,40}(?=<\/button>)/g, "Continue&nbsp;\u2192");
html = html.replace(/[\u00C2\u00E2][\u0080-\u00FF\u20AC\u201A-\u203A\u2122\u0152\u0153\u0178]{2,}/g, "\u2500\u2500\u2500");

/* ---------- 2. Ensure every required script tag is present ---------- */
const requiredScripts = [
  '<script src="qr-rpc-fix.js?v=1" defer></script>',
  '<script src="dash-drag.js?v=4" defer></script>',
  '<script src="dash-order.js?v=2" defer></script>',
  '<script src="hop-stats.js?v=25" defer></script>',
  '<script src="rise-caps.js?v=2" defer></script>',
  '<script src="dashboard-spacing.js?v=2" defer></script>',
  '<script src="ai-chat-ultimate.js?v=1" defer></script>'
];

// Remove any existing tags for these files first (so versions get refreshed)
for (const tag of requiredScripts) {
  const file = tag.match(/src="([^"?]+)/)[1];
  const re = new RegExp('<script[^>]*src="[^"]*' + file.replace(/\./g, "\\.") + '[^"]*"[^>]*>\\s*</script>', "g");
  const before = html;
  html = html.replace(re, "");
  if (before !== html) console.log("removed old tag for:", file);
}

// Add all required scripts right before </body>
if (html.includes("</body>")) {
  const block = "\n  " + requiredScripts.join("\n  ") + "\n";
  html = html.replace("</body>", block + "</body>");
  console.log("added", requiredScripts.length, "script tags");
}

/* ---------- 3. Write with UTF-8, no BOM ---------- */
fs.writeFileSync(path, html, "utf8");

/* ---------- 4. Verify ---------- */
const i1 = html.indexOf("Continue");
console.log("After fix:", JSON.stringify(html.slice(i1, i1 + 40)));
console.log("Arrow present:", html.includes("\u2192"));
console.log("Mojibake markers:", (html.match(/\u00C3|\u00E2\u0080/g) || []).length);
console.log("Script tags in file:");
(html.match(/<script src="[^"]+"/g) || []).forEach(t => console.log("  " + t));
