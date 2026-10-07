/* dash-drag.js — drag-and-drop reordering for dashboard grids
 *   - RISE Categories  (.sd-cats-grid)
 *   - Quick Actions    (.sd-qa-grid)
 *
 * Order is saved per-user in Supabase (table: user_dashboard_layout)
 * with localStorage as a fast cache. Falls back to localStorage-only
 * if the user is not signed in.
 */
(function () {
  "use strict";
  if (window.__dashDrag) return;
  window.__dashDrag = true;

  const LS_KEY   = "qms.dashOrder.v1";
  const TABLE    = "user_dashboard_layout";
  const SELECTORS = [".sd-cats-grid", ".sd-qa-grid", ".quick-access-grid", ".sd-quick-access"];

  // In-memory layout, hydrated from Supabase once
  let layout = {};
  let hydrated = false;
  let currentUserId = null;
  let saveTimer = null;

  /* ---------- helpers ---------- */
  function containerKey(container) {
    const cls = (container.className || "").split(" ").filter(Boolean)[0] || "grid";
    const scope = container.dataset.scope || "";
    return scope ? cls + "|" + scope : cls;
  }

  function childKey(el, index) {
    return (
      el.dataset.id ||
      el.dataset.key ||
      el.getAttribute("data-code") ||
      el.id ||
      (el.textContent || "").trim().slice(0, 40) ||
      ("idx-" + index)
    );
  }

  function lsLoad() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}") || {}; }
    catch (e) { return {}; }
  }
  function lsSave(obj) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(obj)); } catch (e) {}
  }

  /* ---------- Supabase hydration ---------- */
  async function hydrateFromSupabase() {
    if (hydrated) return;
    hydrated = true;

    // Fast path: use localStorage first so drag works immediately
    layout = lsLoad();

    const sb = window.qmsSupabase;
    if (!sb) return;

    try {
      const { data: sess } = await sb.auth.getSession();
      currentUserId = sess && sess.session && sess.session.user && sess.session.user.id;
      if (!currentUserId) return;

      const { data, error } = await sb
        .from(TABLE)
        .select("layout")
        .eq("user_id", currentUserId)
        .maybeSingle();

      if (error) { console.warn("[dash-drag] hydrate error:", error.message); return; }
      if (data && data.layout && typeof data.layout === "object") {
        // Merge: Supabase wins for keys it has; keep any localStorage-only keys
        layout = Object.assign({}, layout, data.layout);
        lsSave(layout);
        console.log("[dash-drag] hydrated from Supabase");
        // Reapply to already-enhanced containers
        document.querySelectorAll(SELECTORS.join(",")).forEach(function (c) {
          applyOrder(c);
        });
      }
    } catch (e) {
      console.warn("[dash-drag] hydrate failed:", e);
    }
  }

  async function saveToSupabase() {
    const sb = window.qmsSupabase;
    if (!sb || !currentUserId) return;
    try {
      const payload = {
        user_id: currentUserId,
        layout: layout,
        updated_at: new Date().toISOString()
      };
      const { error } = await sb
        .from(TABLE)
        .upsert(payload, { onConflict: "user_id" });
      if (error) console.warn("[dash-drag] save error:", error.message);
    } catch (e) {
      console.warn("[dash-drag] save failed:", e);
    }
  }

  function scheduleSave() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      lsSave(layout);
      saveToSupabase();
    }, 500);
  }

  /* ---------- order application ---------- */
  function applyOrder(container) {
    const key = containerKey(container);
    const order = layout[key];
    if (!order || !order.length) return;

    const children = Array.from(container.children);
    if (!children.length) return;

    const map = new Map();
    children.forEach(function (el, i) { map.set(childKey(el, i), el); });

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
    const key = containerKey(container);
    const ids = Array.from(container.children).map(function (el, i) { return childKey(el, i); });
    layout[key] = ids;
    scheduleSave();
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
    if (container.dataset.dragEnhanced === "1") return;
    container.dataset.dragEnhanced = "1";
    Array.from(container.children).forEach(function (child) {
      makeDraggable(child, container);
    });
    applyOrder(container);
  }

  /* ---------- scanning ---------- */
  function scan() {
    SELECTORS.forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (container) {
        if (!container || container.children.length === 0) return;
        // Re-enhance if children changed
        const allReady = Array.from(container.children).every(function (c) { return c.dataset.dragReady; });
        if (!allReady) {
          container.dataset.dragEnhanced = "";
          container.dataset.dragEnhanced = "1";
        }
        enhance(container);
      });
    });
  }

  /* ---------- init ---------- */
  function start() {
    hydrateFromSupabase();
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
