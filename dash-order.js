/* dash-order.js — reorder dashboard sections */
(function () {
  "use strict";
  if (window.__dashOrderV3) return;
  window.__dashOrderV3 = true;

  function inject() {
    var existing = document.getElementById("dash-order-css");
    if (existing) existing.remove();

    var s = document.createElement("style");
    s.id = "dash-order-css";
    s.textContent = [
      "#main-content .sd-wrap {",
      "  display: flex !important;",
      "  flex-direction: column !important;",
      "  gap: 20px !important;",
      "}",
      "#main-content .sd-wrap > .sd-grid-bg,",
      "#main-content .sd-wrap > .sd-noise-orb { order: 0 !important; }",
      "#main-content .sd-wrap > .glass-card.sd-hero { order: 1 !important; }",
      "#main-content .sd-wrap > .glass-card { order: 2 !important; }",
      "#main-content .sd-wrap > .rise-categories-panel { order: 3 !important; }",
      "#main-content .sd-wrap > .sd-cats-grid { order: 4 !important; }"
    ].join("\n");
    document.head.appendChild(s);
    console.log("[dash-order] v3 injected");
  }

  inject();
  new MutationObserver(inject).observe(document.head, { childList: true });
})();
