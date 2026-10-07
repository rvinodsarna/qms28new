/* Force dashboard order via injected CSS at runtime */
(function () {
  "use strict";
  if (window.__dashOrder) return;
  window.__dashOrder = true;

  function inject() {
    if (document.getElementById("dash-order-css")) return;
    var s = document.createElement("style");
    s.id = "dash-order-css";
    s.textContent = `
      #main-content .sd-wrap {
        display: flex !important;
        flex-direction: column !important;
        gap: 20px !important;
      }
      #main-content .sd-wrap > .sd-grid-bg,
      #main-content .sd-wrap > .sd-noise-orb {
        order: 0 !important;
      }
      #main-content .sd-wrap > .glass-card.sd-hero       { order: 1 !important; }
      #main-content .sd-wrap > .glass-card:not(.sd-hero) { order: 2 !important; }
      #main-content .sd-wrap > .rise-categories-heading   { order: 3 !important; margin: 4px 0 0 4px !important; }
      #main-content .sd-wrap > .qms-rise-h                { order: 3 !important; margin: 4px 0 0 4px !important; }
      #main-content .sd-wrap > .sd-cats-grid             { order: 4 !important; }
    `;
    document.head.appendChild(s);
    console.log("[dash-order] injected");
  }

  inject();
  // Re-inject if the head is replaced
  new MutationObserver(inject).observe(document.head, { childList: true });
})();