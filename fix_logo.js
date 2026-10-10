const fs = require("fs");

/* Only the green laser on the school name.
   Logo animation removed so the original app animation returns. */
const css = [
  "/* navbar-anim.css — green laser on the school name only */",
  "/* The logo is NOT targeted here — original app animation is preserved. */",
  "",
  "/* Green laser text effect on school name / subtitle */",
  ".topbar-logo-sub,",
  ".topbar-logo-sub > *,",
  ".topbar .topbar-logo-sub,",
  "#app .topbar-logo-sub {",
  "  background: linear-gradient(90deg,#00ff88 0%,#7dffb0 25%,#00ff88 50%,#00c46a 75%,#00ff88 100%) !important;",
  "  background-size: 300% 100% !important;",
  "  -webkit-background-clip: text !important;",
  "  background-clip: text !important;",
  "  -webkit-text-fill-color: transparent !important;",
  "  color: transparent !important;",
  "  animation: navLaser 2.4s linear infinite !important;",
  "  text-shadow: 0 0 12px rgba(0,255,136,0.55), 0 0 24px rgba(0,255,136,0.25) !important;",
  "  font-weight: 700 !important;",
  "  letter-spacing: 0.05em !important;",
  "  position: relative;",
  "  display: inline-block;",
  "}",
  "@keyframes navLaser {",
  "  0%   { background-position: 0% 50%; }",
  "  100% { background-position: 300% 50%; }",
  "}",
  "",
  "/* Fast shimmer overlay for the laser effect */",
  ".topbar-logo-sub::after {",
  "  content: \"\";",
  "  position: absolute; inset: 0;",
  "  background: linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.7) 50%,transparent 100%);",
  "  background-size: 200% 100%;",
  "  mix-blend-mode: screen;",
  "  pointer-events: none;",
  "  animation: navShimmer 2.6s ease-in-out infinite;",
  "  opacity: 0.6;",
  "}",
  "@keyframes navShimmer {",
  "  0%,100% { background-position: -100% 0; opacity: 0.25; }",
  "  50%     { background-position: 200% 0;  opacity: 0.85; }",
  "}",
  "",
  "/* Respect reduced motion */",
  "@media (prefers-reduced-motion: reduce) {",
  "  .topbar-logo-sub, .topbar-logo-sub * { animation: none !important; }",
  "}"
];

fs.writeFileSync("navbar-anim.css", css.join(String.fromCharCode(10)), "utf8");
console.log("navbar-anim.css rewritten (" + fs.statSync("navbar-anim.css").size + " bytes)");
console.log("has topbar-logo (logo animation):", fs.readFileSync("navbar-anim.css","utf8").includes(".topbar-logo {"));
console.log("has topbar-logo-sub (green text):", fs.readFileSync("navbar-anim.css","utf8").includes(".topbar-logo-sub"));
