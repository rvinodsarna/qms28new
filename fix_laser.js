const f = require("fs");
let html = f.readFileSync("index.html", "utf8");

// Remove old overrides
html = html.replace(/<style id="green-laser">[\s\S]*?<\/style>/g, "");
html = html.replace(/<style id="cyber-school">[\s\S]*?<\/style>/g, "");
html = html.replace(/<style id="green-school">[\s\S]*?<\/style>/g, "");

const block = '<style id="green-laser">' +
  '@keyframes glScan{' +
    '0%{left:-150px;opacity:0}' +
    '20%{opacity:1}' +
    '80%{opacity:1}' +
    '100%{left:110%;opacity:0}' +
  '}' +
  '@keyframes glPulse{' +
    '0%,100%{box-shadow:0 0 8px rgba(0,255,136,0.4),0 0 16px rgba(0,255,136,0.2)}' +
    '50%{box-shadow:0 0 20px rgba(0,255,136,0.9),0 0 38px rgba(0,255,136,0.5)}' +
  '}' +
  '@keyframes glShimmer{' +
    '0%{background-position:0% 50%}' +
    '100%{background-position:300% 50%}' +
  '}' +
  /* Wrapper — no background here (that would kill the text color) */
  '.topbar-school-tag{' +
    'position:relative !important;' +
    'display:inline-block !important;' +
    'overflow:hidden !important;' +
    'padding:3px 16px !important;' +
    'border-radius:6px !important;' +
    'border:1px solid rgba(0,255,136,0.5) !important;' +
    'box-shadow:0 0 12px rgba(0,255,136,0.35) !important;' +
    'animation:glPulse 2.4s ease-in-out infinite !important;' +
    'z-index:1 !important;' +
  '}' +
  /* Dark pill behind everything */
  '.topbar-school-tag::before{' +
    'content:"" !important;' +
    'position:absolute !important;' +
    'inset:0 !important;' +
    'background:linear-gradient(180deg,rgba(0,25,12,0.72),rgba(0,10,5,0.9)) !important;' +
    'border-radius:6px !important;' +
    'z-index:-1 !important;' +
    'pointer-events:none !important;' +
  '}' +
  /* Laser beam that sweeps across */
  '.topbar-school-tag::after{' +
    'content:"" !important;' +
    'position:absolute !important;' +
    'top:0;bottom:0 !important;' +
    'width:90px !important;' +
    'background:linear-gradient(90deg,transparent,rgba(200,255,220,0.9),transparent) !important;' +
    'pointer-events:none !important;' +
    'animation:glScan 2.8s linear infinite !important;' +
    'z-index:5 !important;' +
  '}' +
  /* Keep the gradient text on .luxury-title */
  '.topbar-school-tag.luxury-title{' +
    'background:linear-gradient(100deg,#00c46a 0%,#7dffb0 18%,#00ff88 34%,#e6ffe6 50%,#ffffff 62%,#00ff88 78%,#7dffb0 100%) !important;' +
    'background-size:300% auto !important;' +
    '-webkit-background-clip:text !important;' +
    'background-clip:text !important;' +
    '-webkit-text-fill-color:transparent !important;' +
    'color:transparent !important;' +
    'animation:metallicShift 6s linear infinite,diamondGlint 3s ease-in-out infinite,glPulse 2.4s ease-in-out infinite !important;' +
    'text-shadow:none !important;' +
    'font-weight:800 !important;' +
  '}' +
  '</style>\n</head>';

html = html.replace("</head>", block);
f.writeFileSync("index.html", html, "utf8");
console.log("fixed green laser CSS added");