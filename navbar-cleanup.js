// ════════════════════════════════════════════════════════════
// NAVBAR CLEANUP — Removes SoCDT and unwanted nav items
// Runs AFTER app.js to clean up dynamically generated content
// ════════════════════════════════════════════════════════════

function cleanNavbar() {
  setTimeout(() => {
    const navbar = document.getElementById('navbar');
    if (!navbar) {
      console.log('⚠️ No navbar found');
      return;
    }

    console.log('🧹 Cleaning navbar...');

    // Remove SoCDT badges and hero eyebrows
    navbar.querySelectorAll('.so-csi-badge, .hero-eyebrow, .badge-text, .dean-eyebrow').forEach(badge => {
      const text = badge.textContent || '';
      if (text.includes('SoCDT') || text.includes('School of Computing') || text.includes('Dashboard')) {
        console.log('✅ Removed:', text.substring(0, 40));
        badge.remove();
      }
    });

    // Remove unwanted nav items
    navbar.querySelectorAll('.nav-item').forEach(item => {
      const text = item.textContent.toLowerCase();
      if (text.includes('dashboard') || text.includes('analytics') || text.includes('documents')) {
        console.log('✅ Removed nav item:', text.trim());
        item.remove();
      }
    });

    // Remove hero sections with unwanted text
    navbar.querySelectorAll('.hero, .page-header').forEach(hero => {
      const text = hero.textContent || '';
      if (text.includes('Dean Dashboard') || text.includes('SoCDT')) {
        console.log('✅ Removed hero');
        hero.remove();
      }
    });

    console.log('✅ Navbar cleanup complete!');
  }, 1500);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', cleanNavbar);
} else {
  cleanNavbar();
}

console.log('🚀 Navbar cleanup script loaded');

/* Hide the "?" help button in the top-left (next to the hamburger) */
(function () {
  "use strict";
  if (window.__hideQL) return;
  window.__hideQL = true;

  function hideQ() {
    document.querySelectorAll("*").forEach(function(el){
      // Must be a small element (not a container)
      var r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      if (r.width > 80 || r.height > 80) return;
      if (r.left > 200 || r.top > 120) return;   // top-left area only

      var txt = (el.textContent || "").trim();
      if (txt !== "?") return;                    // exactly "?"

      // Skip if inside a form/input (won't be, but safe)
      if (el.closest("input, textarea, select, form")) return;

      // Hide the clickable wrapper, not just the character
      var target = el.closest("button, a, [role='button']") || el;
      target.style.setProperty("display", "none", "important");
      target.setAttribute("data-hide-q", "1");
      console.log("[hide-q] hidden:", target.tagName, target.className);
    });
  }

  var scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    setTimeout(function(){ scheduled = false; hideQ(); }, 500);
  }

  var obs = new MutationObserver(schedule);
  function init() { hideQ(); obs.observe(document.body, { childList: true, subtree: true }); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();