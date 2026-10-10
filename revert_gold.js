const f = require("fs");

// 1. Strip all my override <style> blocks from index.html
let html = f.readFileSync("index.html", "utf8");
html = html.replace(/<style id="cyber-school">[\s\S]*?<\/style>/g, "");
html = html.replace(/<style id="green-school">[\s\S]*?<\/style>/g, "");
f.writeFileSync("index.html", html, "utf8");
console.log("stripped style overrides");
console.log("cyber-school still there:", html.includes('id="cyber-school"'));
console.log("green-school still there:", html.includes('id="green-school"'));

// 2. Restore the gold gradient in .luxury-title inside styles.css
let css = f.readFileSync("styles.css", "utf8");
const before = css;

// Replace only the .luxury-title gradient line back to gold
const currentGreen = "linear-gradient(100deg,#00c46a 0%,#7dffb0 18%,#00ff88 34%,#e6e6e6 50%,#ffffff 62%,#00c46a 78%,#7dffb0 100%)";
const originalGold = "linear-gradient(100deg,#b38728 0%,#fcf6ba 18%,#bf953f 34%,#e6e6e6 50%,#ffffff 62%,#b38728 78%,#fcf6ba 100%)";

if (css.includes(currentGreen)) {
  css = css.split(currentGreen).join(originalGold);
  console.log("gold gradient restored");
} else {
  // Fallback: any remaining green RGB in a luxury-title gradient
  css = css.replace(/linear-gradient\(100deg,#00c46a[^)]*\)/g, originalGold);
  console.log("applied fallback gold replacement");
}

f.writeFileSync("styles.css", css, "utf8");
console.log("styles.css changed:", before !== css);