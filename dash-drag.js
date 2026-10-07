/* dash-drag.js — enable drag-and-drop reordering for
 *   - RISE Categories  (.sd-cats-grid)
 *   - Quick Actions    (.sd-qa-grid)
 * Order saved to localStorage, keyed per-container.
 * Re-applies automatically whenever the dashboard re-renders.
 */
(function () {
  "use strict";
  if (window.__dashDrag) return;
  window.__dashDrag = true;

  const STORE_KEY = "qms.dashOrder.v1";
  const SELECTORS = [".sd-cats-grid", ".sd-qa-grid", ".quick-access-grid", ".sd-quick-access"];

  /* ---------- storage ---------- */
  function loadOrder() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || "{}") || {}; }
    catch (e) { return {}; }
  }
  function saveOrder(obj) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(obj)); } catch (e) {}
  }

  /* ---------- helpers ---------- */
  function childKey(el, index) {
    // Prefer stable identifiers so order survives re-renders
    return (
      el.dataset.id ||
      el.dataset.key ||
      el.getAttribute("data-code") ||
      el.id ||
      (el.textContent || "").trim().slice(0, 40) ||
      ("idx-" + index)
    );
  }

  function applyOrder(container) {
    const key = container.className.split(" ")[0] + "|" + (container.dataset.scope || "");
    const order = loadOrder()[key];
    if (!order || !order.length) return;

    const children = Array.from(container.children);
    if (!children.length) return;

    // Build a lookup by childKey
    const map = new Map();
    children.forEach(function (el, i) { map.set(childKey(el, i), el); });

    // Append in saved order; unknown items go to the end
    const used = new Set();
    order.forEach(function (k) {
      const el = map.get(k);
      if (el) { container.appendChild(el); used.add(k); }
    });
    children.forEach(function (el, i) {
      const k = childKey(el, i);
      if (!used.has(k)) container.appendChild(el);
    });
  }

  function persistOrder(container) {
    const key = container.className.split(" ")[0] + "|" + (container.dataset.scope || "");
    const ids = Array.from(container.children).map(function (el, i) { return childKey(el, i); });
    const all = loadOrder();
    all[key] = ids;
    saveOrder(all);
  }

  /* ---------- drag behavior ---------- */
  let dragEl = null;
  let dragContainer = null;

  function makeDraggable(el, container) {
    if (el.dataset.dragReady) return;
    el.dataset.dragReady = "1";
    el.setAttribute("draggable", "true");
    el.style.cursor = "grab";
    el.style.transition = "transform 0.15s ease, opacity 0.15s ease";

    el.addEventListener("dragstart", function (e) {
      dragEl = el;
      dragContainer = container;
      el.style.opacity = "0.4";
      el.style.cursor = "grabbing";
      try {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", "drag");
      } catch (err) {}
    });

    el.addEventListener("dragend", function () {
      el.style.opacity = "";
      el.style.cursor = "grab";
      if (dragContainer) persistOrder(dragContainer);
      dragEl = null;
      dragContainer = null;
    });

    el.addEventListener("dragover", function (e) {
      e.preventDefault();
      if (!dragEl || dragEl === el || dragEl.parentElement !== el.parentElement) return;
      const rect = el.getBoundingClientRect();
      const after = (e.clientY - rect.top) / rect.height > 0.5;
      const parent = el.parentElement;
      if (after) parent.insertBefore(dragEl, el.nextSibling);
      else parent.insertBefore(dragEl, el);
    });
  }

  function enhance(container) {
    if (container.dataset.dragEnhanced) return;
    container.dataset.dragEnhanced = "1";
    Array.from(container.children).forEach(function (child) {
      makeDraggable(child, container);
    });
    applyOrder(container);
  }

  /* ---------- scanning & mutation watching ---------- */
  function scan() {
    SELECTORS.forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (container) {
        if (!container || container.children.length === 0) return;
        enhance(container);
        // If children changed (e.g. re-render), re-attach
        Array.from(container.children).forEach(function (child) {
          if (!child.dataset.dragReady) {
            container.dataset.dragEnhanced = "";
            enhance(container);
          }
        });
      });
    });
  }

  /* ---------- init ---------- */
  function start() {
    scan();
    const obs = new MutationObserver(function () { scan(); });
    obs.observe(document.body, { childList: true, subtree: true });
    console.log("[dash-drag] active on", SELECTORS.join(", "));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
