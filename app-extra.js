function togglePasswordVisibility(t,e){const n=document.getElementById(t);if(!n)return;const o="text"===n.type;n.type=o?"password":"text",e&&(e.textContent=o?"👁️":"🙈",e.setAttribute("aria-label",o?"Show password":"Hide password"))}!function(){function t(){document.querySelectorAll(".sidebar,.main-content,.modal-box,.fal-content-shell,.fal-sidebar,.fal-featured-list,.fal-workshop,.fal-stage-content,.fal-tool-panel,.fal-info-panel,.pchat-roster,.pchat-thread-body").forEach(function(t){if(t.__fingerScrollBound)return;t.__fingerScrollBound=!0;const e=t.classList.contains("sidebar")||t.classList.contains("main-content")||t.classList.contains("modal-box")||t.classList.contains("fal-content-shell")||t.classList.contains("fal-sidebar")||t.classList.contains("fal-featured-list")||t.classList.contains("fal-tool-panel")||t.classList.contains("fal-info-panel")||t.classList.contains("pchat-roster")||t.classList.contains("pchat-thread-body");let n=!1,o=!1,a=null,s=0,l=0,i=0,r=0;function c(){if(o&&null!=a)try{t.releasePointerCapture(a)}catch(t){}n=!1,o=!1,a=null,t.style.cursor="grab"}t.addEventListener("pointerdown",function(e){"touch"!==e.pointerType&&("mouse"===e.pointerType&&0!==e.button||e.target.closest('button,a,input,textarea,select,[contenteditable="true"]')||(n=!0,o=!1,a=e.pointerId,s=e.clientX,l=e.clientY,i=t.scrollLeft,r=t.scrollTop))}),t.addEventListener("pointermove",function(c){if(!n||c.pointerId!==a)return;const d=c.clientX-s,u=c.clientY-l;if(!o&&Math.hypot(d,u)>6){o=!0,t.style.cursor="grabbing";try{t.setPointerCapture(a)}catch(t){}}o&&(c.preventDefault(),t.scrollTop=r-u,e||(t.scrollLeft=i-d))}),t.addEventListener("pointerup",c),t.addEventListener("pointercancel",c),t.addEventListener("pointerleave",function(){o||(n=!1)})})}"loading"===document.readyState?document.addEventListener("DOMContentLoaded",t):t(),setInterval(t,1500)}();
window.__playLogoutVideoOverlay = function () {
    const overlay = document.getElementById('logout-video-overlay');
    const video = document.getElementById('logout-video');
    const skipBtn = document.getElementById('logout-video-skip-btn');
    if (!overlay || !video) return;

    let closed = false;
    function closeOverlay() {
        if (closed) return;
        closed = true;
        overlay.classList.add('fade-out');
        setTimeout(() => {
            overlay.classList.remove('visible', 'fade-out');
            video.pause();
            video.currentTime = 0;
        }, 500);
        video.removeEventListener('ended', closeOverlay);
        if (skipBtn) skipBtn.removeEventListener('click', closeOverlay);
    }

    video.currentTime = 0;
    video.muted = false;
    overlay.classList.add('visible');
    video.addEventListener('ended', closeOverlay, { once: true });
    if (skipBtn) skipBtn.addEventListener('click', closeOverlay, { once: true });

    const playPromise = video.play();
    if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
            video.muted = true;
            video.play().catch(() => {});
        });
    }

    // Safety timeout in case 'ended' never fires (e.g. video fails to load)
    setTimeout(closeOverlay, 20000);
};
