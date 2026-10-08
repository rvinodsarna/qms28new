const fs = require("fs");
let s = fs.readFileSync("dash-drag.js", "utf8");

// Find and replace FIXED_TILES array
const oldArr = /var FIXED_TILES = \[[\s\S]*?\];/;
const newArr = `var FIXED_TILES = [
    { icon: "\\uD83C\\uDF93", code: "academic-support", route: "academic-support", cls: "qa-green",   display: "Academic Support" },
    { icon: "\\uD83D\\uDCC8", code: "my-progress",      route: "my-progress",      cls: "qa-magenta", display: "My Progress" },
    { icon: "\\uD83D\\uDCC5", code: "timetable",        route: "timetable",        cls: "qa-cyan",    display: "Timetable" },
    { icon: "\\uD83D\\uDCDA", code: "study-plan",       route: "study-plan",       cls: "qa-violet",  display: "Study Plan" }
  ];`;

const before = s;
s = s.replace(oldArr, newArr);

if (s !== before) {
  console.log("FIXED_TILES replaced with only 4 tiles");
} else {
  console.log("WARN: FIXED_TILES pattern not found");
}

fs.writeFileSync("dash-drag.js", s, "utf8");

// Verify
const verify = s.match(/var FIXED_TILES = \[[\s\S]*?\];/);
if (verify) {
  const matches = verify[0].match(/code:\s*"([^"]+)"/g);
  console.log("Fixed codes now:", matches ? matches.join(", ") : "(none)");
}

// Bump version
let html = fs.readFileSync("index.html", "utf8");
html = html.replace(/dash-drag\.js\?v=\d+/g, "dash-drag.js?v=16");
fs.writeFileSync("index.html", html, "utf8");
console.log("bumped to v=16");
