const f = require("fs");
let css = f.readFileSync("styles.css", "utf8");

// Find the .luxury-title rule and force the correct gold gradient + clip
const goodRule = ".luxury-title{font-family:'Cinzel',serif;font-weight:700;font-size:13px;letter-spacing:1.5px;text-transform:uppercase;background:linear-gradient(100deg,#b38728 0%,#fcf6ba 18%,#bf953f 34%,#e6e6e6 50%,#ffffff 62%,#b38728 78%,#fcf6ba 100%);background-size:300% auto;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent;animation:metallicShift 6s linear infinite,diamondGlint 3s ease-in-out infinite;position:relative;display:inline-block}";

// Replace any existing .luxury-title rule
const re = /\.luxury-title\s*\{[^}]*\}/;
if (re.test(css)) {
  css = css.replace(re, goodRule);
  console.log("replaced .luxury-title with correct gold rule");
} else {
  console.log("WARN: .luxury-title rule not found");
}

f.writeFileSync("styles.css", css, "utf8");

// Verify
const check = css.match(/\.luxury-title\s*\{[^}]*\}/);
if (check) {
  console.log("--- luxury-title now ---");
  console.log(check[0].slice(0, 400));
}