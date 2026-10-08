const fs = require("fs");

// Find which file has .luxury-title
const files = ["styles.css", "so-csi-styles.css", "index.html"];
const goldColors = ["179, 135, 40", "191, 149, 63", "252, 246, 186"];
const greenColors = ["0, 196, 106", "0, 255, 136", "125, 255, 176"];

let touched = 0;
for (const file of files) {
  try {
    let src = fs.readFileSync(file, "utf8");
    const before = src;
    
    // Replace gold RGBs inside .luxury-title blocks
    // Simple global replace of those RGB triplets
    src = src.replace(/179,\s*135,\s*40/g, "0, 196, 106");
    src = src.replace(/191,\s*149,\s*63/g, "0, 255, 136");
    src = src.replace(/252,\s*246,\s*186/g, "125, 255, 176");
    src = src.replace(/255,\s*184,\s*0/g, "0, 255, 136");
    src = src.replace(/205,\s*127,\s*50/g, "0, 196, 106");
    src = src.replace(/#b38728/gi, "#00c46a");
    src = src.replace(/#bf953f/gi, "#00ff88");
    src = src.replace(/#fcf6ba/gi, "#7dffb0");
    src = src.replace(/#ffb800/gi, "#00ff88");
    src = src.replace(/#cd7f32/gi, "#00c46a");
    
    if (src !== before) {
      fs.writeFileSync(file, src, "utf8");
      console.log("patched:", file);
      touched++;
    } else {
      console.log("no change:", file);
    }
  } catch (e) {
    console.log("skip:", file, e.message);
  }
}
console.log("done. files patched:", touched);

// Show what .luxury-title looks like now
try {
  const css = fs.readFileSync("styles.css", "utf8");
  const m = css.match(/\.luxury-title[^{]*\{[^}]*\}/);
  if (m) console.log("\n--- luxury-title now ---\n" + m[0].slice(0, 500));
} catch (e) {}