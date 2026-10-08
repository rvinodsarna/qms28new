const fs = require("fs");
let html = fs.readFileSync("index.html", "utf8");

html = html.replace(/<style id="dash-reorder">[\s\S]*?<\/style>/g, "");

const style = '<style id="dash-reorder">' +
  '#main-content .sd-wrap{display:flex !important;flex-direction:column !important;gap:28px !important;padding-bottom:40px !important}' +
  '#main-content .sd-wrap > .sd-grid-bg,' +
  '#main-content .sd-wrap > .sd-noise-orb{order:0 !important}' +
  '#main-content .sd-wrap > .glass-card.sd-hero{order:1 !important;margin-bottom:0 !important}' +
  '#main-content .sd-wrap > .glass-card:has(.sd-qa-grid){order:2 !important;margin-bottom:0 !important}' +
  '#main-content .sd-wrap > .glass-card:has(.sd-cats-grid){order:3 !important;margin-bottom:0 !important}' +
  '#main-content .sd-wrap > .rise-categories-panel{order:3 !important;margin-bottom:0 !important}' +
  '#main-content .sd-wrap > .glass-card{order:4 !important;margin-bottom:0 !important}' +
  '#main-content .sd-wrap > .sd-cats-grid{order:5 !important}' +
  '</style>\n</head>';

html = html.replace("</head>", style);
fs.writeFileSync("index.html", html, "utf8");
console.log("gap added:", html.includes("gap:28px"));