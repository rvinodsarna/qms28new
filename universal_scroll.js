const fs = require("fs");

const css = `/* UNIVERSAL SCROLL — every frame, every menu, every content area scrolls */
* {
  scrollbar-width: thin;
}
html, body {
  overflow: auto !important;
  overflow-x: hidden !important;
  overflow-y: auto !important;
  height: auto !important;
  min-height: 100% !important;
  position: static !important;
  max-height: none !important;
}
/* Every container that could hold content — allow scroll */
#app, #app *, #main-content, #main-content *,
.app, .app *, .app-body,
.content, .content *, .page-content, .page-content *,
section, article, aside, main, nav, header, footer,
div, ul, ol, dl, form {
  overflow-y: auto !important;
  overflow-x: hidden !important;
  max-height: none !important;
}
/* Modal / drawer / overlay / dialog */
.modal, .modal *, .modal-content, .modal-body,
.drawer, .drawer *, .drawer-content,
.overlay, .overlay *, .overlay-content,
[role="dialog"], [role="dialog"] * {
  overflow-y: auto !important;
  max-height: none !important;
}
/* Specific QMS frames */
.sd-wrap, .sd-cats-grid, .sd-qa-grid,
.glass-card, .card, .panel,
.sidebar, .sidebar-inner,
.tab-content, .tab-pane,
table, .table-wrap, .table-responsive,
#ai-chat-panel .ai-chat-messages,
.ai-drawer-msgs, .ai-drawer {
  overflow-y: auto !important;
  max-height: none !important;
}
/* Never trap scroll */
[style*="overflow:hidden"], [style*="overflow: hidden"],
[style*="overflow-y:hidden"], [style*="overflow-y: hidden"] {
  overflow-y: auto !important;
}
/* Keep sidebar / chat heights sane */
.sidebar-inner { max-height: 100vh; }
#ai-chat-panel .ai-chat-messages { max-height: 100%; }
`;

fs.writeFileSync("styles-scroll-fix.css", css, "utf8");

let html = fs.readFileSync("index.html", "utf8");
html = html.replace(/styles-scroll-fix\.css\?v=\d+/g, "styles-scroll-fix.css?v=200");
fs.writeFileSync("index.html", html, "utf8");
console.log("universal scroll CSS written");
console.log("version:", (html.match(/styles-scroll-fix\.css\?v=(\d+)/) || [])[1]);
