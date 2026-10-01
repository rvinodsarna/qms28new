// ════════════════════════════════════════════════════════════
// SO-CSI NAVBAR JAVASCRIPT
// ════════════════════════════════════════════════════════════

function toggleMobileNav() {
  const navbar = document.getElementById('navbar');
  const mobileNav = navbar.querySelector('.mobile-nav');

  if (mobileNav) {
    mobileNav.classList.toggle('open');
    const toggle = navbar.querySelector('.nav-toggle');
    toggle.textContent = mobileNav.classList.contains('open') ? '✕' : '☰';
  }
}

function initNavbarScroll() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  window.addEventListener('scroll', () => {
    if (window.pageYOffset > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  });
}

function initNavItems() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  navbar.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      navbar.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      if (window.innerWidth <= 868) {
        toggleMobileNav();
      }
    });
  });
}

function initSoCsiNavbar() {
  initNavbarScroll();
  initNavItems();
  console.log('✅ So-CSI Navbar initialized');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSoCsiNavbar);
} else {
  initSoCsiNavbar();
}
