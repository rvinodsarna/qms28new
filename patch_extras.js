const fs = require("fs");
let s = fs.readFileSync("dashboard-extras.js", "utf8");

// Replace the EXTRAS array to keep only Award & Recognition
const oldArr = `var EXTRAS = [
    { icon: "\\uD83C\\uDFC5", label: "Award & Recognition",     color: "#ffb800", route: "award-recognition" },
    { icon: "\\uD83E\\uDD1D", label: "Community Service",       color: "#00e5c0", route: null                },
    { icon: "\\uD83D\\uDCDA", label: "Research & Publications", color: "#a855f7", route: null                }
  ];`;

const newArr = `var EXTRAS = [
    { icon: "\\uD83C\\uDFC5", label: "Award & Recognition", color: "#ffb800", route: "award-recognition" }
  ];`;

if (s.includes(oldArr)) {
  s = s.replace(oldArr, newArr);
  console.log("patched EXTRAS array");
} else {
  console.log("exact match not found — trying loose pattern");
  // Fallback: remove the two lines by their labels
  s = s.replace(/\s*\{\s*icon:\s*"[^"]*",\s*label:\s*"Community Service"[^}]*\},?/g, "");
  s = s.replace(/\s*\{\s*icon:\s*"[^"]*",\s*label:\s*"Research & Publications"[^}]*\},?/g, "");
  console.log("applied loose pattern");
}

// Also change the "3" checks to "1"
s = s.replace(/data-extra-card"\)\.length === 3/g, 'data-extra-card").length === 1');

// Remove the "Coming soon" text from injected cards — Award has a route so it's safe
s = s.replace(/<div class="sd-cat-meta">Coming soon<\/div>/g, '<div class="sd-cat-meta">Tap to view</div>');

fs.writeFileSync("dashboard-extras.js", s, "utf8");
console.log("done");
