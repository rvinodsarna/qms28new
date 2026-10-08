const fs = require("fs");
let html = fs.readFileSync("index.html", "utf8");

if (html.includes("dash-drag.js")) {
  console.log("already linked");
} else {
  // Add before </body>
  html = html.replace("</body>", '  <script src="dash-drag.js?v=19" defer></script>\n</body>');
  fs.writeFileSync("index.html", html, "utf8");
  console.log("added dash-drag.js");
}

// Verify
console.log("dash-drag present:", html.includes("dash-drag.js"));
console.log("dash-order present:", html.includes("dash-order"));
console.log("rise-heading present:", html.includes("rise-heading"));
