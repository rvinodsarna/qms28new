const fs = require("fs");
let s = fs.readFileSync("index.html", "utf8");

if (s.includes("styles-scroll-fix.css")) {
  console.log("already linked");
} else {
  const tag = '  <link rel="stylesheet" href="styles-scroll-fix.css?v=1">\n';
  if (s.includes("</head>")) {
    s = s.replace("</head>", tag + "</head>");
    fs.writeFileSync("index.html", s, "utf8");
    console.log("linked");
  } else {
    console.log("ERROR: no </head>");
  }
}

// Verify
const m = s.match(/styles-scroll-fix\.css\?v=(\d+)/);
console.log("version in HTML:", m ? m[1] : "MISSING");
