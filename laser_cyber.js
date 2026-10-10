const f = require("fs");
let html = f.readFileSync("index.html", "utf8");
html = html.replace(/<style id="cyber-school">[\s\S]*?<\/style>/g, "");

const css = '<style id="cyber-school">' +
  '@keyframes csLaser{' +
    '0%{background-position:-200% 50%}' +
    '100%{background-position:200% 50%}' +
  '}' +
  '@keyframes csScan{' +
    '0%{transform:translateX(-100%);opacity:0}' +
    '10%{opacity:1}' +
    '90%{opacity:1}' +
    '100%{transform:translateX(200%);opacity:0}' +
  '}' +
  '@keyframes csGlitch{' +
    '0%,90%,100%{transform:translate(0);filter:none}' +
    '92%{transform:translate(-2px,0);filter:hue-rotate(90deg)}' +
    '94%{transform:translate(2px,0);filter:hue-rotate(-90deg)}' +
    '96%{transform:translate(-1px,0)}' +
  '}' +
  '@keyframes csPulse{' +
    '0%,100%{box-shadow:0 0 8px rgba(0,255,136,0.7),0 0 18px rgba(0,255,136,0.35)}' +
    '50%{box-shadow:0 0 16px rgba(0,255,136,1),0 0 32px rgba(0,255,136,0.55)}' +
  '}' +
  '@keyframes csCursorBlink{' +
    '0%,49%{opacity:1}' +
    '50%,100%{opacity:0}' +
  '}' +
  '.topbar-school-tag,.topbar-school-tag.luxury-title{' +
    'position:relative !important;' +
    'display:inline-block !important;' +
    'overflow:hidden !important;' +
    'padding:2px 10px 2px 8px !important;' +
    'border-radius:4px !important;' +
    'border:1px solid rgba(0,255,136,0.35) !important;' +
    'background:linear-gradient(180deg,rgba(0,20,10,0.55),rgba(0,10,5,0.75)) !important;' +
    'box-shadow:0 0 12px rgba(0,255,136,0.25),inset 0 0 12px rgba(0,255,136,0.08) !important;' +
    'font-family:\'Cinzel\',\'Courier New\',monospace !important;' +
    'font-weight:800 !important;' +
    'letter-spacing:2.5px !important;' +
    'text-transform:uppercase !important;' +
    'animation:csGlitch 8s ease-in-out infinite !important;' +
  '}' +
  '.topbar-school-tag::before,.topbar-school-tag.luxury-title::before{' +
    'content:"" !important;' +
    'position:absolute !important;' +
    'top:0;left:0;right:0;bottom:0 !important;' +
    'background:linear-gradient(90deg,transparent 0%,rgba(0,255,136,0.55) 45%,rgba(200,255,220,1) 50%,rgba(0,255,136,0.55) 55%,transparent 100%) !important;' +
    'background-size:200% 100% !important;' +
    'mix-blend-mode:screen !important;' +
    'pointer-events:none !important;' +
    'animation:csScan 3.2s linear infinite !important;' +
    'z-index:2 !important;' +
  '}' +
  '.topbar-school-tag::after,.topbar-school-tag.luxury-title::after{' +
    'content:"" !important;' +
    'position:absolute !important;' +
    'left:0;right:0;bottom:0 !important;' +
    'height:1px !important;' +
    'background:linear-gradient(90deg,transparent,#00ff88,transparent) !important;' +
    'animation:csPulse 2s ease-in-out infinite !important;' +
    'pointer-events:none !important;' +
  '}' +
  '</style>\n</head>';

html = html.replace("</head>", css);
f.writeFileSync("index.html", html, "utf8");
console.log("cyber laser CSS added:", html.includes('id="cyber-school"'));