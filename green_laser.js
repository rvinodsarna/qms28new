const f = require("fs");

// 1. Restore styles.css .luxury-title to make it work as a gradient text container
let css = f.readFileSync("styles.css", "utf8");

// Only replace the .luxury-title rule, leave everything else alone
const re = /\.luxury-title\s*\{[^}]*\}/;
const goodRule = ".luxury-title{font-family:'Cinzel',serif;font-weight:800;font-size:13px;letter-spacing:2px;text-transform:uppercase;background:linear-gradient(100deg,#00c46a 0%,#7dffb0 18%,#00ff88 34%,#c8ffe0 50%,#ffffff 62%,#00ff88 78%,#7dffb0 100%);background-size:300% auto;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent;animation:metallicShift 6s linear infinite,diamondGlint 3s ease-in-out infinite;position:relative;display:inline-block}";

if (re.test(css)) {
  css = css.replace(re, goodRule);
  console.log("styles.css .luxury-title -> green gradient");
}
f.writeFileSync("styles.css", css, "utf8");

// 2. Add a laser sweep overlay via index.html <style>
let html = f.readFileSync("index.html", "utf8");
html = html.replace(/<style id="cyber-school">[\s\S]*?<\/style>/g, "");
html = html.replace(/<style id="green-school">[\s\S]*?<\/style>/g, "");

const block = '<style id="green-laser">' +
  '@keyframes glScan{' +
    '0%{transform:translateX(-150%);opacity:0}' +
    '15%{opacity:1}' +
    '85%{opacity:1}' +
    '100%{transform:translateX(150%);opacity:0}' +
  '}' +
  '@keyframes glPulse{' +
    '0%,100%{box-shadow:0 0 8px rgba(0,255,136,0.4),0 0 16px rgba(0,255,136,0.2),inset 0 0 8px rgba(0,255,136,0.08)}' +
    '50%{box-shadow:0 0 18px rgba(0,255,136,0.9),0 0 34px rgba(0,255,136,0.5),inset 0 0 16px rgba(0,255,136,0.2)}' +
  '}' +
  '.topbar-school-tag{' +
    'position:relative !important;' +
    'display:inline-block !important;' +
    'overflow:hidden !important;' +
    'padding:3px 14px !important;' +
    'border-radius:6px !important;' +
    'border:1px solid rgba(0,255,136,0.45) !important;' +
    'background:linear-gradient(180deg,rgba(0,20,10,0.5),rgba(0,10,5,0.7)) !important;' +
    'animation:glPulse 2.4s ease-in-out infinite !important;' +
  '}' +
  '.topbar-school-tag::after{' +
    'content:"" !important;' +
    'position:absolute !important;' +
    'top:0;left:0;bottom:0 !important;' +
    'width:80px !important;' +
    'background:linear-gradient(90deg,transparent,rgba(200,255,220,0.9),transparent) !important;' +
    'mix-blend-mode:screen !important;' +
    'pointer-events:none !important;' +
    'animation:glScan 2.8s linear infinite !important;' +
    'z-index:3 !important;' +
  '}' +
  '</style>\n</head>';

html = html.replace("</head>", block);
f.writeFileSync("index.html", html, "utf8");
console.log("green laser CSS added");