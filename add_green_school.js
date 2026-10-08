const fs = require("fs");
let html = fs.readFileSync("index.html", "utf8");

// Remove old version if exists
html = html.replace(/<style id="green-school">[\s\S]*?<\/style>/g, "");

// Add green school name CSS
const css = '<style id="green-school">' +
  '.topbar-school, .topbar-logo-sub, .school-name, .topbar-subtitle, ' +
  '.topbar-school-name, [class*="school-name"], [class*="schoolName"] {' +
    'color:#00ff88 !important;' +
    'text-shadow:0 0 10px rgba(0,255,136,0.6),0 0 20px rgba(0,255,136,0.3) !important;' +
    'font-weight:700 !important;' +
    'letter-spacing:0.05em !important;' +
  '}' +
  '</style>\n</head>';

html = html.replace("</head>", css);
fs.writeFileSync("index.html", html, "utf8");
console.log("green school CSS added:", html.includes('id="green-school"'));