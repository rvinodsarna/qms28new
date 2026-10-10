const fs = require("fs");
let html = fs.readFileSync("index.html", "utf8");

// Add CSS link in <head>
if (!html.includes("styles-ai-chat.css")) {
  if (html.includes("</head>")) {
    html = html.replace("</head>", '  <link rel="stylesheet" href="styles-ai-chat.css?v=1">\n</head>');
    console.log("added: styles-ai-chat.css link");
  }
}

// Add script tags before </body>
const tags = [
  '<script src="qr-rpc-fix.js?v=1" defer></script>',
  '<script src="dash-drag.js?v=4" defer></script>',
  '<script src="ai-chat.js?v=1" defer></script>'
];
for (const tag of tags) {
  const file = tag.match(/src="([^"?]+)/)[1];
  if (html.includes(file)) { console.log("already:", file); continue; }
  if (html.includes("</body>")) {
    html = html.replace("</body>", "  " + tag + "\n</body>");
    console.log("added:", file);
  }
}

fs.writeFileSync("index.html", html, "utf8");

// Verify
const i = html.indexOf("Continue");
console.log("Continue line:", JSON.stringify(html.slice(i, i + 30)));
console.log("Arrow present:", html.includes("\u2192"));
