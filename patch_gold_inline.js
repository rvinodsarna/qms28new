const fs = require("fs");
const path = "index.html";
let html = fs.readFileSync(path, "utf8");

const MARKER_START = "<!-- QMS-GOLD-SHIMMER-START -->";
const MARKER_END   = "<!-- QMS-GOLD-SHIMMER-END -->";

// Remove old block (idempotent)
const s = html.indexOf(MARKER_START);
if (s !== -1) {
  const e = html.indexOf(MARKER_END, s);
  if (e !== -1) {
    html = html.slice(0, s) + html.slice(e + MARKER_END.length);
    console.log("ℹ️  Removed previous gold-shimmer block");
  }
}

const BLOCK = MARKER_START + `
<style id="qms-gold-shimmer-override">
  /* Nuclear override — gold shimmer for QMS RISE v28.0 */
  .topbar-logo-sub,
  .topbar-logo .topbar-logo-sub,
  .topbar .topbar-logo-sub,
  #topbar-page-title,
  .topbar-logo-text + .topbar-logo-sub {
    background: linear-gradient(
      90deg,
      #a16207 0%,
      #facc15 18%,
      #fff7c2 38%,
      #ffd700 50%,
      #fff7c2 62%,
      #facc15 82%,
      #a16207 100%
    ) !important;
    background-size: 220% auto !important;
    -webkit-background-clip: text !important;
    background-clip: text !important;
    -webkit-text-fill-color: transparent !important;
    color: transparent !important;
    font-weight: 700 !important;
    letter-spacing: 1.5px !important;
    text-shadow: 0 0 8px rgba(255, 200, 60, 0.35) !important;
    animation: qmsGoldShimmer 3.2s linear infinite !important;
    will-change: background-position !important;
  }
  @keyframes qmsGoldShimmer {
    0%   { background-position:   0% 50%; }
    100% { background-position: 220% 50%; }
  }
  @media (prefers-reduced-motion: reduce) {
    .topbar-logo-sub { animation: none !important; background-position: 50% 50% !important; }
  }
</style>
` + MARKER_END;

// Insert right before </head> (best), else before <body>, else at top
if (html.includes("</head>")) {
  html = html.replace("</head>", BLOCK + "\n</head>");
  console.log("✅ Injected before </head>");
} else if (html.includes("<body")) {
  html = html.replace("<body", BLOCK + "\n<body");
  console.log("✅ Injected before <body>");
} else {
  html = BLOCK + "\n" + html;
  console.log("✅ Injected at top of file");
}

fs.writeFileSync(path, html, "utf8");
console.log("✅ index.html patched");