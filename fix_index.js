const fs = require("fs");
let s = fs.readFileSync("index.html", "utf8");

for (const tag of [
  '<script src="qr-rpc-fix.js?v=1" defer></script>',
  '<script src="dash-drag.js?v=4" defer></script>'
]) {
  const file = tag.match(/src="([^"?]+)/)[1];
  if (s.includes(file)) { console.log("already:", file); continue; }
  if (s.includes("</body>")) {
    s = s.replace("</body>", "  " + tag + "\n</body>");
    console.log("added:", file);
  }
}
fs.writeFileSync("index.html", s, "utf8");

// Verify
const i = s.indexOf("Continue");
console.log("Continue line:", JSON.stringify(s.slice(i, i + 40)));
console.log("Arrow present:", s.includes("\u2192"));
console.log("Mojibake markers:", (s.match(/\u00c3|\u00e2\u0080/g) || []).length);
