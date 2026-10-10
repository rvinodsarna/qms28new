const fs = require("fs");

// 1. Remove ALL scroll-hijacking scripts I added
["smooth-scroll.js", "scroll-nuke.js", "scroll-force.js"].forEach(f => {
  try { fs.unlinkSync(f); console.log("deleted:", f); } catch (e) {}
});

// 2. Remove their tags from index.html
let html = fs.readFileSync("index.html", "utf8");
html = html.replace(/\s*<script[^>]*(smooth-scroll|scroll-nuke|scroll-force)[^>]*><\/script>/gi, "");

// 3. Add a floating scroll-helper with UP / DOWN buttons
const helper = `<!-- scroll-helper: click-to-scroll buttons for broken mouse wheels -->
<div id="scroll-helper" style="
  position:fixed;right:16px;bottom:100px;z-index:99999;
  display:flex;flex-direction:column;gap:8px;
  pointer-events:auto;
">
  <button id="scroll-up" title="Scroll up" style="
    width:44px;height:44px;border-radius:50%;
    background:linear-gradient(135deg,rgba(0,245,255,0.85),rgba(124,58,237,0.85));
    border:1px solid rgba(255,255,255,0.3);
    color:#001a1f;font-size:20px;font-weight:900;cursor:pointer;
    box-shadow:0 4px 16px rgba(0,245,255,0.4);
    display:flex;align-items:center;justify-content:center;
    user-select:none;transition:transform .15s;
  ">&#9650;</button>
  <button id="scroll-down" title="Scroll down" style="
    width:44px;height:44px;border-radius:50%;
    background:linear-gradient(135deg,rgba(0,245,255,0.85),rgba(124,58,237,0.85));
    border:1px solid rgba(255,255,255,0.3);
    color:#001a1f;font-size:20px;font-weight:900;cursor:pointer;
    box-shadow:0 4px 16px rgba(0,245,255,0.4);
    display:flex;align-items:center;justify-content:center;
    user-select:none;transition:transform .15s;
  ">&#9660;</button>
</div>
<script>
(function () {
  var STEP = 120;
  var TICK_MS = 15;

  function makeScrollButton(btnId, direction) {
    var btn = document.getElementById(btnId);
    if (!btn) return;
    var interval = null;

    function scrollByStep() {
      var el = document.scrollingElement || document.documentElement;
      el.scrollTop += STEP * direction;
    }

    btn.addEventListener("mousedown", function (e) {
      e.preventDefault();
      scrollByStep();
      interval = setInterval(scrollByStep, TICK_MS);
    });
    btn.addEventListener("mouseup", function () {
      if (interval) { clearInterval(interval); interval = null; }
    });
    btn.addEventListener("mouseleave", function () {
      if (interval) { clearInterval(interval); interval = null; }
    });

    // Touch support
    btn.addEventListener("touchstart", function (e) {
      e.preventDefault();
      scrollByStep();
      interval = setInterval(scrollByStep, TICK_MS);
    }, { passive: false });
    btn.addEventListener("touchend", function () {
      if (interval) { clearInterval(interval); interval = null; }
    });

    // Hover effect
    btn.addEventListener("mouseenter", function () { btn.style.transform = "scale(1.1)"; });
    btn.addEventListener("mouseleave", function () { btn.style.transform = "scale(1)"; });
  }

  makeScrollButton("scroll-up", -1);
  makeScrollButton("scroll-down", 1);
  console.log("[scroll-helper] click buttons ready");
})();
</script>`;

if (!html.includes("scroll-helper")) {
  html = html.replace("</body>", helper + "\n</body>");
  console.log("added scroll-helper buttons");
}

fs.writeFileSync("index.html", html, "utf8");
console.log("index.html updated");
console.log("smooth-scroll still there:", html.includes("smooth-scroll"));
console.log("scroll-nuke still there:", html.includes("scroll-nuke"));
console.log("scroll-helper present:", html.includes("scroll-helper"));
