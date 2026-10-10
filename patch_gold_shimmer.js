const fs = require("fs");
const path = "styles.css";
let css = fs.readFileSync(path, "utf8");

const RULE = String.raw`
/* ── Gold shimmer for QMS RISE v28.0 (topbar logo sub) ── */
.topbar-logo-sub {
  background: linear-gradient(
    90deg,
    #a16207 0%,
    #facc15 18%,
    #fff7c2 38%,
    #ffd700 50%,
    #fff7c2 62%,
    #facc15 82%,
    #a16207 100%
  );
  background-size: 220% auto;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
  font-weight: 700;
  letter-spacing: 1.5px;
  text-shadow: 0 0 8px rgba(255, 200, 60, 0.25);
  animation: qmsGoldShimmer 3.2s linear infinite;
  will-change: background-position;
}

@keyframes qmsGoldShimmer {
  0%   { background-position: 0% 50%; }
  100% { background-position: 220% 50%; }
}

@media (prefers-reduced-motion: reduce) {
  .topbar-logo-sub { animation: none; background-position: 50% 50%; }
}
`;

// Remove any previous patched block so it's idempotent
const startTag = "/* ── Gold shimmer for QMS RISE v28.0 (topbar logo sub) ── */";
const endTag   = "@media (prefers-reduced-motion: reduce) {\n  .topbar-logo-sub { animation: none; background-position: 50% 50%; }\n}";
if (css.includes(startTag)) {
  const s = css.indexOf(startTag);
  const e = css.indexOf(endTag, s);
  if (e !== -1) {
    css = css.slice(0, s) + css.slice(e + endTag.length);
    console.log("ℹ️  Removed previous patch block");
  }
}

// Neutralize any old conflicting rules on .topbar-logo-sub
css = css.replace(
  /\.topbar-logo-sub\s*\{[^}]*\}/g,
  "/* old .topbar-logo-sub rule disabled by gold-shimmer patch */"
);

css += "\n" + RULE + "\n";
fs.writeFileSync(path, css, "utf8");
console.log("✅ styles.css patched: gold shimmer added");