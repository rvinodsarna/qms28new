const fs = require("fs");
let html = fs.readFileSync("index.html", "utf8");
html = html.replace(
  /<video[^>]*QMS_LOGO\.webm[^>]*><\/video>/,
  '<img src="./QMS_LOGO.gif" alt="QMS Logo" style="width:100%;height:100%;object-fit:contain;border-radius:4px;" onerror="this.style.display=\'none\';this.parentNode.textContent=\'Q\';" />'
);
fs.writeFileSync("index.html", html, "utf8");
console.log("swapped to GIF");
console.log("has QMS_LOGO.gif:", html.includes("QMS_LOGO.gif"));
