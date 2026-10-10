const fs = require("fs");
let s = fs.readFileSync("dash-drag.js", "utf8");

// Fix the broken join() call
s = s.replace(/\]\.join\("\s*\r?\n\s*"\);/g, '].join(String.fromCharCode(10));');

fs.writeFileSync("dash-drag.js", s, "utf8");
console.log("patched join");
