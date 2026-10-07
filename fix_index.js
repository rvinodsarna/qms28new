const fs = require("fs");
let html = fs.readFileSync("index.html", "utf8");

for (const tag of [
  '<script src="qr-rpc-fix.js?v=1" defer></script>',
  '<script src="dash-drag.js?v=3" defer></script>'
]) {
  const file = tag.match(/src="([^"?]+)/)[1];
  if (html.includes(file)) { console.log("already:", file); continue; }
  if (html.includes("</body>")) {
    html = html.replace("</body>", "  " + tag + "\n</body>");
    console.log("added:", file);
  }
}
fs.writeFileSync("index.html", html, "utf8");

// Definitive check via Node (UTF-8 aware)
const i = html.indexOf("Continue");
console.log("Continue line:", JSON.stringify(html.slice(i, i + 30)));
