const f = require("fs");
let html = f.readFileSync("index.html", "utf8");

html = html.replace(/<style id="green-laser">[\s\S]*?<\/style>/g, "");
html = html.replace(/<style id="cyber-school">[\s\S]*?<\/style>/g, "");
html = html.replace(/<style id="green-school">[\s\S]*?<\/style>/g, "");

const block = '<style id="green-laser">' +
  '@keyframes glScan{0%{left:-150px;opacity:0}20%{opacity:1}80%{opacity:1}100%{left:110%;opacity:0}}' +
  '@keyframes glPulse{0%,100%{box-shadow:0 0 10px rgba(0,255,136,0.5),0 0 20px rgba(0,255,136,0.25),inset 0 0 0 9999px rgba(0,18,8,0.55)}50%{box-shadow:0 0 22px rgba(0,255,136,0.95),0 0 40px rgba(0,255,136,0.5),inset 0 0 0 9999px rgba(0,18,8,0.55)}}' +
  /* The pill + laser + glow — background property reserved for the text gradient */
  '.topbar-school-tag{' +
    'position:relative !important;' +
    'display:inline-block !important;' +
    'overflow:hidden !important;' +
    'padding:3px 18px !important;' +
    'border-radius:6px !important;' +
    'border:1px solid rgba(0,255,136,0.7) !important;' +
    'animation:glPulse 2.4s ease-in-out infinite !important;' +
    'z-index:1 !important;' +
  '}' +
  '.topbar-school-tag::after{' +
    'content:"" !important;' +
    'position:absolute !important;' +
    'top:0;bottom:0 !important;' +
    'width:90px !important;' +
    'background:linear-gradient(90deg,transparent,rgba(255,255,255,0.9),transparent) !important;' +
    'pointer-events:none !important;' +
    'animation:glScan 2.8s linear infinite !important;' +
    'z-index:5 !important;' +
  '}' +
  /* BRIGHT gradient text on .luxury-title */
  '.topbar-school-tag.luxury-title{' +
    'background:linear-gradient(100deg,#b8ffd5 0%,#ffffff 25%,#7dffb0 50%,#ffffff 75%,#b8ffd5 100%) !important;' +
    'background-size:300% auto !important;' +
    '-webkit-background-clip:text !important;' +
    'background-clip:text !important;' +
    '-webkit-text-fill-color:transparent !important;' +
    'color:transparent !important;' +
    'animation:metallicShift 5s linear infinite !important;' +
    'font-weight:900 !important;' +
    'filter:none !important;' +
    'text-shadow:none !important;' +
  '}' +
  '</style>\n</head>';

html = html.replace("</head>", block);
f.writeFileSync("index.html", html, "utf8");
console.log("bright green laser v2 added");