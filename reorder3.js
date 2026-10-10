const f = require("fs");
let html = f.readFileSync("index.html", "utf8");

// Remove old reorder block
html = html.replace(/<style id="dash-reorder">[\s\S]*?<\/style>/g, "");

const css = '<style id="dash-reorder">' +
  /* Force flex column so order works */
  '#main-content .sd-wrap{' +
    'display:flex !important;' +
    'flex-direction:column !important;' +
    'gap:28px !important;' +
  '}' +
  /* Order: Welcome (hero) → Quick Actions → RISE Categories */
  '#main-content .sd-wrap > .sd-grid-bg,' +
  '#main-content .sd-wrap > .sd-noise-orb{order:0 !important}' +
  '#main-content .sd-wrap > .glass-card.sd-hero{order:1 !important;margin-bottom:0 !important}' +
  '#main-content .sd-wrap > .glass-card:has(.sd-qa-grid){order:2 !important;margin-bottom:0 !important}' +
  '#main-content .sd-wrap > .glass-card:has(.sd-cats-grid){order:3 !important;margin-bottom:0 !important}' +
  '#main-content .sd-wrap > .rise-categories-panel{order:3 !important;margin-bottom:0 !important}' +
  '#main-content .sd-wrap > #rise-cat-title{order:3 !important}' +
  '#main-content .sd-wrap > .sd-cats-grid{order:4 !important}' +
  '#main-content .sd-wrap > .glass-card{order:5 !important;margin-bottom:0 !important}' +
  '</style>\n</head>';

html = html.replace("</head>", css);
f.writeFileSync("index.html", html, "utf8");
console.log("order flipped: Welcome → Quick Actions → RISE Categories");