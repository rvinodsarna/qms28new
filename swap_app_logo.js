const fs = require("fs");
let s = fs.readFileSync("app.js", "utf8");

const before = s.length;
const count = (s.match(/QMS_LOGO\.jpg/g) || []).length;
console.log("occurrences of QMS_LOGO.jpg:", count);

// Replace every occurrence with the animated GIF
s = s.split("./QMS_LOGO.jpg").join("./QMS_LOGO.gif");

fs.writeFileSync("app.js", s, "utf8");

const after = (s.match(/QMS_LOGO\.gif/g) || []).length;
const leftJpg = (s.match(/QMS_LOGO\.jpg/g) || []).length;
console.log("QMS_LOGO.gif occurrences:", after);
console.log("QMS_LOGO.jpg remaining:", leftJpg);
console.log("size change:", before, "->", s.length);
