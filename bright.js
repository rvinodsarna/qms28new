const f = require("fs");
let html = f.readFileSync("index.html", "utf8");

html = html.replace(/<style id="green-laser">[\s\S]*?<\/style>/g, "");
html = html.replace(/<style id="cyber-school">[\s\S]*?<\/style>/g, "");
html = html.replace(/<style id="green-school">[\s\S]*?<\/style>/g, "");

const block = '<style id="green-laser">' +
  '@keyframes glScan{0%{left:-150px;opacity:0}20%{opacity:1}80%{opacity:1}100%{left:110%;opacity:0}}' +
  '@keyframes glPulse{0%,100%{box-shadow:0 0 8px rgba(0,255,136,0.4),0 0 16px rgba(0,255,136,0.2)}50%{box-shadow:0 0 20px rgba(0,255,136,0.9),0 0 38px rgba(0,255,136,0.5)}}' +
  '.topbar-school-tag{' +
    'position:relative !important;' +
    'display:inline-block !important;' +
    'overflow:hidden !important;' +
    'padding:3px 16px !important;' +
    'border-radius:6px !important;' +
    'border:1px solid rgba(0,255,136,0.55) !important;' +
    'box-shadow:0 0 14px rgba(0,255,136,0.45) !important;' +
    'animation:glPulse 2.4s ease-in-out infinite !important;' +
    'z-index:1 !important;' +
  '}' +
  '.topbar-school-tag::before{' +
    'content:"" !important;' +
    'position:absolute !important;' +
    'inset:0 !important;' +
    'background:linear-gradient(180deg,rgba(0,25,12,0.72),rgba(0,10,5,0.9)) !important;' +
    'border-radius:6px !important;' +
    'z-index:-1 !important;' +
    'pointer-events:none !important;' +
  '}' +
  '.topbar-school-tag::after{' +
    'content:"" !important;' +
    'position:absolute !important;' +
    'top:0;bottom:0 !important;' +
    'width:90px !important;' +
    'background:linear-gradient(90deg,transparent,rgba(255,255,255,0.95),transparent) !important;' +
    'pointer-events:none !important;' +
    'animation:glScan 2.8s linear infinite !important;' +
    'z-index:5 !important;' +
  '}' +
  /* BRIGHT green — no dark greens */
  '.topbar-school-tag.luxury-title{' +
    'background:linear-gradient(100deg,#7dffb0 0%,#b8ffd5 20%,#ffffff 35%,#00ff88 50%,#ffffff 65%,#b8ffd5 80%,#7dffb0 100%) !important;' +
    'background-size:300% auto !important;' +
    '-webkit-background-clip:text !important;' +
    'background-clip:text !important;' +
    '-webkit-text-fill-color:transparent !important;' +
    'color:transparent !important;' +
    'animation:metallicShift 5s linear infinite,diamondGlint 2.4s ease-in-out infinite,glPulse 2.4s ease-in-out infinite !important;' +
    'text-shadow:0 0 8px rgba(0,255,136,0.6) !important;' +
    'font-weight:900 !important;' +
    'filter:drop-shadow(0 0 6px rgba(0,255,136,0.5)) !important;' +
  '}' +
  '</style>\n</head>';

html = html.replace("</head>", block);
f.writeFileSync("index.html", html, "utf8");
console.log("bright green laser added");