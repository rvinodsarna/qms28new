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
console.log("green school CSS added:", html.includes('id="green-school"'));const fs = require("fs");
let html = fs.readFileSync("index.html", "utf8");

// Remove old version
html = html.replace(/<style id="green-school">[\s\S]*?<\/style>/g, "");

// Target the exact class that's showing gold
const css = '<style id="green-school">' +
  '.topbar-school-tag,' +
  '.topbar-school-tag.luxury-title,' +
  '.topbar .topbar-school-tag,' +
  '.topbar-logo .topbar-school-tag {' +
    'color:#00ff88 !important;' +
    '-webkit-text-fill-color:#00ff88 !important;' +
    'background:none !important;' +
    'background-image:none !important;' +
    '-webkit-background-clip:unset !important;' +
    'background-clip:unset !important;' +
    'text-shadow:0 0 10px rgba(0,255,136,0.7),0 0 22px rgba(0,255,136,0.35) !important;' +
    'font-weight:800 !important;' +
    'letter-spacing:0.05em !important;' +
  '}' +
  '</style>\n</head>';

html = html.replace("</head>", css);
fs.writeFileSync("index.html", html, "utf8");
console.log("green school CSS targeting .topbar-school-tag added");const fs = require("fs");
let html = fs.readFileSync("index.html", "utf8");
html = html.replace(/<style id="green-school">[\s\S]*?<\/style>/g, "");

const css = '<style id="green-school">' +
  '.topbar-school-tag,' +
  '.topbar-school-tag.luxury-title {' +
    'background:linear-gradient(100deg,#00c46a 0%,#7dffb0 18%,#00ff88 34%,#c8ffe0 50%,#ffffff 62%,#00ff88 78%,#7dffb0 100%) !important;' +
    'background-size:200% 100% !important;' +
    '-webkit-background-clip:text !important;' +
    'background-clip:text !important;' +
    '-webkit-text-fill-color:transparent !important;' +
    'color:transparent !important;' +
    'animation:6s linear infinite metallicShift, 3s ease-in-out infinite diamondGlint !important;' +
    'text-shadow:0 0 14px rgba(0,255,136,0.45) !important;' +
    'font-weight:800 !important;' +
  '}' +
  '</style>\n</head>';

html = html.replace("</head>", css);
fs.writeFileSync("index.html", html, "utf8");
console.log("green gradient added");