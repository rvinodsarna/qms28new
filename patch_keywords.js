const fs = require("fs");
let s = fs.readFileSync("ai-chat.js", "utf8");

// Add keywords to buildIndex text
const oldBuild = 'var txt = (f.question||"") + " " + (f.answer||"") + " " + (f.category||"");';
const newBuild = 'var txt = (f.question||"") + " " + (f.answer||"") + " " + (f.category||"") + " " + ((f.keywords||[]).join(" "));';

if (s.includes(oldBuild)) {
  s = s.replace(oldBuild, newBuild);
  console.log("patched buildIndex");
} else {
  console.log("buildIndex pattern not found (looking for alt)");
}

// Add keywords to scoreFaq text
const oldScore = 'var fToks = tokenize((f.question||"") + " " + (f.answer||""));';
const newScore = 'var fToks = tokenize((f.question||"") + " " + (f.answer||"") + " " + ((f.keywords||[]).join(" ")));';

if (s.includes(oldScore)) {
  s = s.replace(oldScore, newScore);
  console.log("patched scoreFaq");
} else {
  console.log("scoreFaq pattern not found (looking for alt)");
}

fs.writeFileSync("ai-chat.js", s, "utf8");
