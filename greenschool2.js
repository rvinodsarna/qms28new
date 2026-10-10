const f = require("fs");
let html = f.readFileSync("index.html", "utf8");
html = html.replace(/<style id="green-school">[\s\S]*?<\/style>/g, "");

const css = '<style id="green-school">' +
  '.topbar-school-tag,.topbar-school-tag.luxury-title{' +
    'background:linear-gradient(100deg,#00c46a 0%,#7dffb0 18%,#00ff88 34%,#c8ffe0 50%,#ffffff 62%,#00ff88 78%,#7dffb0 100%) !important;' +
    'background-size:200% 100% !important;' +
    '-webkit-background-clip:text !important;' +
    'background-clip:text !important;' +
    '-webkit-text-fill-color:transparent !important;' +
    'color:transparent !important;' +
    'animation:6s linear infinite metallicShift,3s ease-in-out infinite diamondGlint !important;' +
    'text-shadow:0 0 14px rgba(0,255,136,0.45) !important;' +
    'font-weight:800 !important;' +
  '}' +
  '</style>\n</head>';

html = html.replace("</head>", css);
f.writeFileSync("index.html", html, "utf8");
console.log("green gradient added:", html.includes('id="green-school"'));