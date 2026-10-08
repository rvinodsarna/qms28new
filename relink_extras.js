const fs = require("fs");
let html = fs.readFileSync("index.html", "utf8");

if (html.includes("dashboard-extras.js")) {
  console.log("already linked");
} else {
  html = html.replace("</body>", '  <script src="dashboard-extras.js?v=8" defer></script>\n</body>');
  fs.writeFileSync("index.html", html, "utf8");
  console.log("linked dashboard-extras.js");
}

console.log("verify:", html.includes("dashboard-extras.js"));