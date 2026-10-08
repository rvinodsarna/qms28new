const fs = require("fs");
let css = fs.readFileSync("styles-ai-chat.css", "utf8");

// Ensure the panel is fully hidden when closed
const fix = `

/* ═══ FIX: panel must be truly hidden when closed, not just transparent ═══ */
#ai-chat-panel:not(.is-open) {
  visibility: hidden !important;
  pointer-events: none !important;
  opacity: 0 !important;
  display: none !important;
}
#ai-chat-panel.is-open {
  visibility: visible !important;
  pointer-events: auto !important;
  opacity: 1 !important;
  display: flex !important;
}

/* Launcher is fine — it's small and meant to be clicked */
#ai-chat-launcher {
  pointer-events: auto !important;
}
`;

if (!css.includes("FIX: panel must be truly hidden")) {
  css += fix;
  fs.writeFileSync("styles-ai-chat.css", css, "utf8");
  console.log("patched styles-ai-chat.css (" + css.length + " bytes)");
} else {
  console.log("already patched");
}

// Bump version
let html = fs.readFileSync("index.html", "utf8");
const before = html;
html = html.replace(/styles-ai-chat\.css\?v=\d+/g, "styles-ai-chat.css?v=5");
fs.writeFileSync("index.html", html, "utf8");
console.log("bumped styles-ai-chat to v=5:", html !== before);
