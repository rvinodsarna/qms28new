const fs = require("fs");
let html = fs.readFileSync("index.html", "utf8");
if (html.includes("dash-drag.js")) {
  console.log("already linked");
} else {
  html = html.replace("</body>", '  <script src="dash-drag.js?v=20" defer></script>\n</body>');
  fs.writeFileSync("index.html", html, "utf8");
  console.log("added dash-drag.js");
}
console.log("dash-drag linked:", html.includes("dash-drag.js"));