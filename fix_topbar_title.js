const fs = require("fs");
const path = "index.html";
let html = fs.readFileSync(path, "utf8");

// The inline <style> block from earlier -- rewrite it cleanly
const START = "<!-- QMS-GOLD-SHIMMER-START -->";
const END   = "<!-- QMS-GOLD-SHIMMER-END -->";

const s = html.indexOf(START);
const e = html.indexOf(END, s);
if (s === -1 || e === -1) {
  console.log("⚠️  No inline gold-shimmer block found — checking for stray #topbar-page-title rules");
  html = html.replace(/#topbar-page-title\s*,\s*/g, "");
  fs.writeFileSync(path, html, "utf8");
  console.log("✅ Removed any #topbar-page-title from selector lists");
  return;
}

// Clean replacement: ONLY .topbar-logo-sub, no #topbar-page-title
const CLEAN_BLOCK = START + `
<style id="qms-gold-shimmer-override">
  /* Gold shimmer — scoped to topbar logo subtitle ONLY */
  .topbar-logo-sub,
  .topbar-logo .topbar-logo-sub,
  .topbar .topbar-logo-sub,
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
  /* Emojis in topbar page title keep their native colors */
  #topbar-page-title {
    color: inherit !important;
    background: none !important;
    -webkit-text-fill-color: inherit !important;
    -webkit-background-clip: border-box !important;
    background-clip: border-box !important;
    animation: none !important;
    text-shadow: none !important;
  }
  @media (prefers-reduced-motion: reduce) {
    .topbar-logo-sub { animation: none !important; background-position: 50% 50% !important; }
  }
</style>
` + END;

html = html.slice(0, s) + CLEAN_BLOCK + html.slice(e + END.length);

// Also strip #topbar-page-title anywhere it leaked into selector lists
html = html.replace(/#topbar-page-title\s*,\s*/g, "");

fs.writeFileSync(path, html, "utf8");
console.log("✅ index.html: #topbar-page-title excluded from gold gradient");