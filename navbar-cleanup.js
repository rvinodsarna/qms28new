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
