/* dash-drag.js — SortableJS-based reordering for
 *   - RISE Categories  (.sd-cats-grid)
 *   - Quick Actions    (.sd-qa-grid)
 * Order persisted per-user in Supabase (user_dashboard_layout) + localStorage cache.
 */
(function () {
  "use strict";
  if (window.__dashDrag) return;
  window.__dashDrag = true;

  var LS_KEY = "qms.dashOrder.v1";
  var TABLE  = "user_dashboard_layout";
  var layout = {};
  var hydrated = false;
  var currentUserId = null;
  var saveTimer = null;

  function containerKey(c) {
    var cls = (c.className || "").split(" ").filter(Boolean)[0] || "grid";
    return cls;
  }
  function childKey(el, i) {
    return el.dataset.id || el.dataset.key || el.dataset.code ||
           el.id || (el.textContent || "").trim().slice(0, 40) || ("idx-" + i);
  }
  function lsLoad() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}") || {}; }
    catch (e) { return {}; }
  }
  function lsSave(o) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(o)); } catch (e) {}
  }

  async function hydrate() {
    if (hydrated) return; hydrated = true;
    layout = lsLoad();
    var sb = window.qmsSupabase; if (!sb) return;
    try {
      var sess = await sb.auth.getSession();
      currentUserId = sess && sess.data && sess.data.session && sess.data.session.user && sess.data.session.user.id;
      if (!currentUserId) return;
      var res = await sb.from(TABLE).select("layout").eq("user_id", currentUserId).maybeSingle();
      if (res.error) { console.warn("[dash-drag] hydrate:", res.error.message); return; }
      if (res.data && res.data.layout && typeof res.data.layout === "object") {
        layout = Object.assign({}, layout, res.data.layout);
        lsSave(layout);
        console.log("[dash-drag] hydrated from Supabase");
        document.querySelectorAll(".sd-cats-grid, .sd-qa-grid").forEach(applyOrder);
      }
    } catch (e) { console.warn("[dash-drag] hydrate failed:", e); }
  }

  async function save() {
    lsSave(layout);
    var sb = window.qmsSupabase;
    if (!sb || !currentUserId) return;
    try {
      var res = await sb.from(TABLE).upsert({
        user_id: currentUserId,
        layout: layout,
        updated_at: new Date().toISOString()
      }, { onConflict: "user_id" });
      if (res.error) console.warn("[dash-drag] save:", res.error.message);
    } catch (e) { console.warn("[dash-drag] save failed:", e); }
  }
  function scheduleSave() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 500);
  }

  function applyOrder(container) {
    var order = layout[containerKey(container)];
    if (!order || !order.length) return;
    var kids = Array.prototype.slice.call(container.children);
    if (!kids.length) return;
    var map = {};
    kids.forEach(function (el, i) { map[childKey(el, i)] = el; });
    var used = {};
    order.forEach(function (k) {
      if (map[k]) { container.appendChild(map[k]); used[k] = 1; }
    });
    kids.forEach(function (el, i) {
      var k = childKey(el, i);
      if (!used[k]) container.appendChild(el);
    });
  }

  function persistOrder(container) {
    layout[containerKey(container)] =
      Array.prototype.slice.call(container.children).map(childKey);
    scheduleSave();
  }

  function sortableReady() {
    return typeof window.Sortable !== "undefined";
  }

  function attach() {
    if (!sortableReady()) return;
    var u = window.QMS && window.QMS.state && window.QMS.state.user;
    if (!u || u.role !== "student") return;

    var cat = document.querySelector(".sd-cats-grid");
    var qa  = document.querySelector(".sd-qa-grid");
    if (!cat && !qa) return;

    document.body.setAttribute("data-drag-ready", "1");

    if (cat && !cat.dataset.sortableAttached) {
      applyOrder(cat);
      Sortable.create(cat, {
        animation: 180,
        delay: 120,
        delayOnTouchOnly: true,
        ghostClass: "sd-cat-ghost",
        chosenClass: "sd-cat-chosen",
        dragClass: "sd-cat-drag",
        onEnd: function () { persistOrder(cat); }
      });
      cat.dataset.sortableAttached = "1";
    }

    if (qa && !qa.dataset.sortableAttached) {
      applyOrder(qa);
      Sortable.create(qa, {
        animation: 180,
        delay: 120,
        delayOnTouchOnly: true,
        ghostClass: "sd-qa-ghost",
        chosenClass: "sd-qa-chosen",
        dragClass: "sd-qa-drag",
        onEnd: function () { persistOrder(qa); }
      });
      qa.dataset.sortableAttached = "1";
    }
  }

  function injectStyles() {
    if (document.getElementById("dash-drag-styles")) return;
    var s = document.createElement("style");
    s.id = "dash-drag-styles";
    s.textContent = [
      ".sd-cat-card{cursor:grab;transition:box-shadow .15s,transform .15s}",
      ".sd-cat-card:active{cursor:grabbing}",
      ".sd-qa-tile{cursor:grab;transition:box-shadow .15s,transform .15s}",
      ".sd-qa-tile:active{cursor:grabbing}",
      ".sd-cat-ghost,.sd-qa-ghost{opacity:.25;transform:scale(.97)}",
      ".sd-cat-chosen,.sd-qa-chosen{box-shadow:0 0 0 1px rgba(0,245,255,.6),0 8px 24px rgba(0,245,255,.25)}",
      ".sd-cat-drag,.sd-qa-drag{opacity:.95;transform:scale(1.04)}"
    ].join("\n");
    document.head.appendChild(s);
  }

  var pending = false;
  function scan() {
    if (pending) return;
    pending = true;
    setTimeout(function () { pending = false; attach(); }, 400);
  }

  function start() {
    injectStyles();
    hydrate().then(scan);
    new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
    console.log("[dash-drag] Sortable-based loader ready");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();

  window.resetDashboardOrder = function () {
    var u = window.QMS && QMS.state && QMS.state.user;
    if (u) localStorage.removeItem("dash_order_" + u.id);
    localStorage.removeItem(LS_KEY);
    location.reload();
  };
})();
