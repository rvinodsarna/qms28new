/* drag-scroll.js — click and drag anywhere on the page to scroll (like a phone) */
(function () {
  "use strict";
  if (window.__dragScroll) return;
  window.__dragScroll = true;

  var isDown = false;
  var startY = 0;
  var startScroll = 0;
  var moved = false;
  var DRAG_THRESHOLD = 4; // pixels before we treat it as a drag, not a click

  function getScrollEl() {
    // Prefer documentElement; some layouts scroll on body
    var de = document.documentElement;
    if (de.scrollHeight > de.clientHeight) return de;
    return document.scrollingElement || de;
  }

  function shouldIgnore(target) {
    // Don't hijack drags on interactive elements or scrollable inner containers
    if (!target || !target.closest) return false;
    if (target.closest("input, textarea, select, [contenteditable], button, a")) return true;
    // Let inner scrollable containers handle their own drag
    var el = target;
    while (el && el !== document.body) {
      var cs = getComputedStyle(el);
      if ((cs.overflowY === "auto" || cs.overflowY === "scroll") && el.scrollHeight > el.clientHeight) {
        return true;
      }
      el = el.parentElement;
    }
    return false;
  }

  document.addEventListener("mousedown", function (e) {
    if (e.button !== 0) return;       // left click only
    if (shouldIgnore(e.target)) return;
    isDown = true;
    moved = false;
    startY = e.clientY;
    startScroll = getScrollEl().scrollTop;
  }, true);

  document.addEventListener("mousemove", function (e) {
    if (!isDown) return;
    var delta = e.clientY - startY;
    if (!moved && Math.abs(delta) < DRAG_THRESHOLD) return;
    moved = true;
    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";
    getScrollEl().scrollTop = startScroll - delta;
  }, true);

  function endDrag() {
    if (!isDown) return;
    isDown = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }

  document.addEventListener("mouseup", endDrag, true);
  document.addEventListener("mouseleave", endDrag, true);

  // Prevent click when dragging (so you don't accidentally activate things)
  document.addEventListener("click", function (e) {
    if (moved) {
      e.preventDefault();
      e.stopPropagation();
      moved = false;
    }
  }, true);

  // Show grab cursor on empty space
  document.addEventListener("mouseover", function (e) {
    if (isDown) return;
    if (shouldIgnore(e.target)) {
      document.body.style.cursor = "";
    } else {
      document.body.style.cursor = "grab";
    }
  });

  console.log("[drag-scroll] active — click and drag anywhere to scroll");
})();
