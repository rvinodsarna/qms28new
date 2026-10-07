/* Mobile responsiveness for the panels we built */
(function () {
  "use strict";
  if (window.__mobileResp) return;
  window.__mobileResp = true;

  var css = ''
    + '@media (max-width: 900px) {'
    +   '  [data-hop-stats] { padding: 0 !important; }'
    +   '  [data-hop-stats] > div:first-child { padding: 0 !important; }'
    +   '  [data-hop-stats] > div:last-child { padding: 14px !important; }'
    +   '  [data-hop-stats] [style*="display:flex"][style*="gap:12px"] {'
    +     '    display: grid !important;'
    +     '    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;'
    +     '    gap: 10px !important;'
    +     '  }'
    +   '  [data-hop-stats] .hop-kpi-card { width: 100% !important; max-width: 100% !important; flex: unset !important; }'
    +   '  [data-hop-stats] [style*="display:flex"][style*="flex-wrap:wrap"] {'
    +     '    flex-direction: column !important;'
    +     '  }'
    +   '  [data-hop-stats] [style*="display:grid"]:not([style*="repeat(2"]) {'
    +     '    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;'
    +     '  }'
    +   '  [data-hop-stats] svg { max-width: 200px !important; }'
    +   '}'
    + ''
    + '@media (max-width: 600px) {'
    +   '  [data-hop-stats] [style*="display:flex"][style*="gap:12px"] {'
    +     '    grid-template-columns: 1fr !important;'
    +     '  }'
    +   '  [data-hop-stats] [style*="display:grid"] {'
    +     '    grid-template-columns: 1fr !important;'
    +   '  }'
    +   '  [data-hop-stats] svg { max-width: 180px !important; }'
    +   '  [data-hop-stats] [style*="font-size:24px"] { font-size: 22px !important; }'
    +   '  [data-hop-stats] [style*="font-size:30px"] { font-size: 26px !important; }'
    +   '  [data-hop-stats] [style*="font-size:52px"] { font-size: 40px !important; }'
    +   '}'
    + ''
    + '/* Clubs & Roles page */'
    + '@media (max-width: 700px) {'
    +   '#main-content [style*="grid-template-columns:1fr 1fr"] {'
    +     '    grid-template-columns: 1fr !important;'
    +   '}'
    +   '#main-content [style*="grid-template-columns:1fr 1fr 1fr"] {'
    +     '    grid-template-columns: 1fr !important;'
    +   '}'
    +   '#main-content [style*="grid-template-columns:1fr 1fr 1fr 1fr"] {'
    +     '    grid-template-columns: repeat(2, 1fr) !important;'
    +   '}'
    + '}'
    + ''
    + '@media (max-width: 480px) {'
    +   '#main-content [style*="grid-template-columns:repeat(2"] {'
    +     '    grid-template-columns: 1fr !important;'
    +   '}'
    + '}'
    + ''
    + '/* My Progress breakdown panel */'
    + '@media (max-width: 700px) {'
    +   '[data-progress-clubs] [style*="grid-template-columns:1fr 1fr 1fr"] {'
    +     '    grid-template-columns: 1fr !important;'
    +   '}'
    +   '[data-progress-clubs] [style*="grid-template-columns:1fr 1fr"] {'
    +     '    grid-template-columns: 1fr !important;'
    +   '}'
    + '}'
    + ''
    + '/* Make sure the app itself does not overflow on mobile */'
    + '@media (max-width: 900px) {'
    +   '#main-content { overflow-x: hidden !important; max-width: 100% !important; }'
    +   '[data-hop-stats] { max-width: 100% !important; overflow-x: hidden !important; }'
    + '}';

  function ensureStyle() {
    if (document.getElementById("qms-mobile-styles")) return;
    var s = document.createElement("style");
    s.id = "qms-mobile-styles";
    s.textContent = css;
    document.head.appendChild(s);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ensureStyle);
  } else {
    ensureStyle();
  }

  // Re-apply if the app wipes head (rare)
  setInterval(ensureStyle, 3000);
})();