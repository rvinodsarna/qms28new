const fs = require("fs");
let html = fs.readFileSync("index.html", "utf8");

// Remove previous version if any
html = html.replace(/<!-- RISE-TITLE-START -->[\s\S]*?<!-- RISE-TITLE-END -->/g, "");

// Inline script: insert a "RISE Categories" heading before the categories grid
const block = [
  '<!-- RISE-TITLE-START -->',
  '<script>',
  '(function(){',
  '  var tries = 0;',
  '  var iv = setInterval(function(){',
  '    var grid = document.querySelector(".sd-cats-grid");',
  '    if (!grid) { if (++tries > 40) clearInterval(iv); return; }',
  '    if (document.getElementById("rise-cat-title")) { clearInterval(iv); return; }',
  '    var h = document.createElement("div");',
  '    h.id = "rise-cat-title";',
  '    h.style.cssText = "margin:28px 0 16px;padding:0 4px;";',
  '    h.innerHTML = \'<div style="display:flex;align-items:center;gap:14px;"><div style="width:4px;height:34px;border-radius:2px;background:linear-gradient(180deg,#00f5ff,#7c3aed);box-shadow:0 0 14px rgba(0,245,255,0.6);"></div><div><div style="font-size:20px;font-weight:800;letter-spacing:0.5px;background:linear-gradient(90deg,#00f5ff,#7c3aed);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;">RISE Categories</div><div style="font-size:11px;letter-spacing:1.8px;color:#8ab4c8;margin-top:3px;">YOUR ENGAGEMENT BREAKDOWN</div></div></div>\';',
  '    var panel = grid.closest(".rise-categories-panel");',
  '    if (panel) { panel.insertBefore(h, grid); }',
  '    else { grid.parentElement.insertBefore(h, grid); }',
  '    clearInterval(iv);',
  '  }, 400);',
  '})();',
  '</script>',
  '<!-- RISE-TITLE-END -->'
].join("\n");

html = html.replace("</body>", block + "\n</body>");
fs.writeFileSync("index.html", html, "utf8");
console.log("RISE title block added:", html.includes("RISE-TITLE-START"));
console.log("RISE Categories text present:", html.includes("RISE Categories"));