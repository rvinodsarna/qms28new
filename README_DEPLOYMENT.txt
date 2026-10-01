═══════════════════════════════════════════════════════════════
SO-CSI NAVBAR DEPLOYMENT GUIDE
═══════════════════════════════════════════════════════════════

📁 FILES TO UPLOAD TO YOUR QMS-RISE REPOSITORY:
═══════════════════════════════════════════════════════════════

1. index.html — REPLACE your existing index.html
2. so-csi-styles.css — NEW FILE (navbar styles)
3. so-csi-script.js — NEW FILE (navbar JavaScript)
4. navbar-cleanup.js — NEW FILE (removes SoCDT, Dashboard, etc.)

═══════════════════════════════════════════════════════════════
DEPLOYMENT STEPS:
═══════════════════════════════════════════════════════════════

1. Upload all 4 files to your QMS-RISE GitHub repository
   (same level as app.js, styles.css, etc.)

2. Commit with message:
   "Update navbar: Remove SoCDT, Dashboard, Analytics, Documents"

3. Push to main branch:
   git add .
   git commit -m "Update navbar: Remove SoCDT, Dashboard, Analytics, Documents"
   git push origin main

4. Netlify will auto-deploy in ~30 seconds

═══════════════════════════════════════════════════════════════
WHAT'S INCLUDED:
═══════════════════════════════════════════════════════════════

✅ Clean top navbar with ONLY:
   - ☰ Hamburger menu (mobile)
   - 🛡️ Security
   - 🌐 Live Feed
   - User profile

✅ REMOVED:
   - SoCDT badge
   - Dashboard nav item
   - Analytics nav item
   - Documents nav item

✅ Features:
   - Neon glow effects (cyan, violet, green)
   - Glassmorphism with backdrop blur
   - Responsive design (mobile hamburger menu)
   - Smooth animations
   - Auto-cleanup of dynamically generated content

═══════════════════════════════════════════════════════════════
LIVE URL:
═══════════════════════════════════════════════════════════════

https://unimy-qms-rise-v22.netlify.app

═══════════════════════════════════════════════════════════════
