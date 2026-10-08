/* dash-order.js — control dashboard section order:
 *   1. Hero (RISE Score)
 *   2. Quick Actions card
 *   3. RISE Categories panel
 */
(function () {
  "use strict";
  if (window.__dashOrderV2) return;
  window.__dashOrderV2 = true;

  function inject() {
    var existing = document.getElementById("dash-order-css");
    if (existing) existing.remove();

    var s = document.createElement("style");
    s.id = "dash-order-css";
    s.textContent = `
      #main-content .sd-wrap {
        display: flex !important;
        flex-direction: column !important;
        gap: 20px !important;
      }
      #main-content .sd-wrap > .sd-grid-bg,
      #main-content .sd-wrap > .sd-noise-orb { order: 0 !important; }

      /* 1. Hero / score card */
      #main-content .sd-wrap > .glass-card.sd-hero { order: 1 !important; }

      /* 2. Quick Actions card (the glass-card containing .sd-qa-grid) */
      #main-content .sd-wrap > .glass-card:has(.sd-qa-grid),
      #main-content .sd-wrap > .sd-qa-card { order: 2 !important; }

      /* 3. RISE Categories panel */
      #main-content .sd-wrap > .rise-categories-panel,
      #main-content .sd-wrap > .glass-card:has(.sd-cats-grid) { order: 3 !important; }

      /* 4. Any remaining glass cards */
      #main-content .sd-wrap > .glass-card { order: 4 !important; }

      /* Legacy headings (should not exist now, but just in case) */
      #main-content .sd-wrap > .qms-rise-h,
      #main-content .sd-wrap > .rise-categories-heading { order: 5 !important; }

      /* Bare grids (if any slipped out of panels) */
      #main-content .sd-wrap > .sd-cats-grid { order: 6 !important; }
      #main-content .sd-wrap > .sd-qa-grid   { order: 7 !important; }
    `;
    document.head.appendChild(s);
    console.log("[dash-order] v2 injected");
  }

  inject();
  new MutationObserver(inject).observe(document.head, { childList: true });
})();
