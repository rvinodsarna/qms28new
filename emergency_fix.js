const fs = require("fs");

// 1. Kill the anti-flash CSS that might be hiding things
try { fs.unlinkSync("anti-flash.css"); console.log("deleted anti-flash.css"); } catch(e) { console.log("anti-flash.css not found"); }

// 2. Remove the link from index.html
let html = fs.readFileSync("index.html", "utf8");
const before = html.length;
html = html.replace(/\s*<link[^>]*anti-flash\.css[^>]*>/gi, "");
fs.writeFileSync("index.html", html, "utf8");
console.log("removed anti-flash link:", before !== html.length);

// 3. Reset dash-order to safe version — only reorder glass-cards, nothing fancy
const safeOrder = `/* dash-order.js — reorder dashboard sections */
(function () {
  "use strict";
  if (window.__dashOrderV3) return;
  window.__dashOrderV3 = true;

  function inject() {
    var existing = document.getElementById("dash-order-css");
    if (existing) existing.remove();

    var s = document.createElement("style");
    s.id = "dash-order-css";
    s.textContent = [
      "#main-content .sd-wrap {",
      "  display: flex !important;",
      "  flex-direction: column !important;",
      "  gap: 20px !important;",
      "}",
      "#main-content .sd-wrap > .sd-grid-bg,",
      "#main-content .sd-wrap > .sd-noise-orb { order: 0 !important; }",
      "#main-content .sd-wrap > .glass-card.sd-hero { order: 1 !important; }",
      "#main-content .sd-wrap > .glass-card { order: 2 !important; }",
      "#main-content .sd-wrap > .rise-categories-panel { order: 3 !important; }",
      "#main-content .sd-wrap > .sd-cats-grid { order: 4 !important; }"
    ].join("\\n");
    document.head.appendChild(s);
    console.log("[dash-order] v3 injected");
  }

  inject();
  new MutationObserver(inject).observe(document.head, { childList: true });
})();
`;
fs.writeFileSync("dash-order.js", safeOrder, "utf8");
console.log("dash-order.js reset to safe version");

// Bump version
html = fs.readFileSync("index.html", "utf8");
html = html.replace(/dash-order\.js\?v=\d+/g, "dash-order.js?v=4");
fs.writeFileSync("index.html", html, "utf8");
console.log("bumped dash-order to v=4");
