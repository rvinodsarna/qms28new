const fs = require("fs");
let s = fs.readFileSync("ai-chat.js", "utf8");

// Replace the two user-visible FAQ badges
const oldA = 'source = "FAQ - " + (match.faq.category || "General");';
const newA = 'source = match.faq.category || "Answer";';

const oldB = 'source = "FAQ - local";';
const newB = 'source = "Answer";';

let changed = 0;
if (s.includes(oldA)) { s = s.replace(oldA, newA); changed++; console.log("replaced A"); }
else { console.log("A not found (maybe already changed)"); }

if (s.includes(oldB)) { s = s.replace(oldB, newB); changed++; console.log("replaced B"); }
else { console.log("B not found (maybe already changed)"); }

fs.writeFileSync("ai-chat.js", s, "utf8");
console.log("total replacements:", changed);

// Verify no user-visible FAQ strings remain
const userVisible = /["']FAQ - /g.test(s);
console.log("has FAQ - still:", userVisible);
