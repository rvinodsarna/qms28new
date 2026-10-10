const fs = require("fs");
let s = fs.readFileSync("dash-drag.js", "utf8");

/* ─── 1. Remove the red "EDIT MODE" text ─── */
const before1 = s;
s = s.replace(
  /,?\s*"\.sd-qa-grid\[data-edit-mode='1'\]::after\{[^}]*\}"/g,
  ""
);
if (s !== before1) console.log("[1] removed red EDIT MODE text");

/* ─── 2. Replace qmsConfirm modal with QMS-styled version ─── */
const oldModal = /function qmsConfirm\(message, onConfirm\) \{[\s\S]*?\n  \}/;
const newModal = `function qmsConfirm(message, onConfirm) {
    var existing = document.getElementById("qms-confirm-modal");
    if (existing) existing.remove();

    var overlay = document.createElement("div");
    overlay.id = "qms-confirm-modal";
    overlay.style.cssText =
      "position:fixed;inset:0;z-index:9999999;" +
      "background:rgba(6,8,16,0.78);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);" +
      "display:flex;align-items:center;justify-content:center;" +
      "animation:qmsFadeIn 0.2s ease;";

    var box = document.createElement("div");
    box.style.cssText =
      "width:90%;max-width:420px;padding:28px 26px 22px;" +
      "background:linear-gradient(160deg,rgba(12,16,32,0.98),rgba(8,10,24,0.99));" +
      "border:1px solid rgba(0,245,255,0.35);border-radius:18px;" +
      "box-shadow:0 24px 80px rgba(0,0,0,0.7),0 0 40px rgba(0,245,255,0.18),inset 0 1px 0 rgba(255,255,255,0.05);" +
      "font-family:system-ui,-apple-system,sans-serif;color:#eafcff;" +
      "animation:qmsSlideUp 0.3s cubic-bezier(0.34,1.56,0.64,1);";

    box.innerHTML =
      '<div style="display:flex;align-items:center;gap:14px;margin-bottom:14px;">' +
        '<div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,rgba(0,245,255,0.18),rgba(124,58,237,0.18));border:1px solid rgba(0,245,255,0.5);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;box-shadow:0 0 20px rgba(0,245,255,0.35);">\\u2139\\uFE0F</div>' +
        '<div>' +
          '<div style="font-size:16px;font-weight:800;letter-spacing:0.4px;background:linear-gradient(90deg,#00f5ff,#7c3aed);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;">Remove from Quick Actions?</div>' +
          '<div style="font-size:11px;letter-spacing:1.5px;opacity:0.55;margin-top:4px;color:#00f5ff;">QMS RISE \\u2014 CONFIRM ACTION</div>' +
        '</div>' +
      '</div>' +
      '<div style="font-size:13.5px;line-height:1.6;opacity:0.85;margin-bottom:22px;padding-left:2px;color:#c8e8f0;">' + message + '</div>' +
      '<div style="display:flex;gap:10px;justify-content:flex-end;">' +
        '<button id="qms-cancel" style="padding:10px 22px;border-radius:10px;background:rgba(255,255,255,0.05);color:#b6d8e0;border:1px solid rgba(255,255,255,0.18);font-size:12px;font-weight:700;letter-spacing:1.2px;cursor:pointer;transition:all .18s;">CANCEL</button>' +
        '<button id="qms-remove" style="padding:10px 22px;border-radius:10px;background:linear-gradient(135deg,#00f5ff,#7c3aed);color:#001a1f;border:none;font-size:12px;font-weight:800;letter-spacing:1.2px;cursor:pointer;box-shadow:0 0 22px rgba(0,245,255,0.55);transition:all .18s;">CONFIRM</button>' +
      '</div>';

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    if (!document.getElementById("qms-modal-anim")) {
      var st = document.createElement("style");
      st.id = "qms-modal-anim";
      st.textContent =
        "@keyframes qmsFadeIn{from{opacity:0}to{opacity:1}}" +
        "@keyframes qmsSlideUp{from{opacity:0;transform:translateY(20px) scale(0.95)}to{opacity:1;transform:translateY(0) scale(1)}}";
      document.head.appendChild(st);
    }

    function close() { overlay.remove(); }
    var cancelBtn = document.getElementById("qms-cancel");
    var removeBtn = document.getElementById("qms-remove");

    cancelBtn.addEventListener("mouseenter", function () { cancelBtn.style.background = "rgba(0,245,255,0.12)"; cancelBtn.style.borderColor = "rgba(0,245,255,0.5)"; cancelBtn.style.color = "#00f5ff"; });
    cancelBtn.addEventListener("mouseleave", function () { cancelBtn.style.background = "rgba(255,255,255,0.05)"; cancelBtn.style.borderColor = "rgba(255,255,255,0.18)"; cancelBtn.style.color = "#b6d8e0"; });
    removeBtn.addEventListener("mouseenter", function () { removeBtn.style.transform = "scale(1.04)"; removeBtn.style.boxShadow = "0 0 30px rgba(0,245,255,0.8)"; });
    removeBtn.addEventListener("mouseleave", function () { removeBtn.style.transform = ""; removeBtn.style.boxShadow = "0 0 22px rgba(0,245,255,0.55)"; });

    cancelBtn.addEventListener("click", close);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
    document.addEventListener("keydown", function esc(e) {
      if (e.key === "Escape") { close(); document.removeEventListener("keydown", esc); }
    });
    removeBtn.addEventListener("click", function () { close(); onConfirm(); });
  }`;

if (oldModal.test(s)) {
  s = s.replace(oldModal, newModal);
  console.log("[2] replaced modal with QMS-styled version");
} else {
  console.log("WARN: qmsConfirm pattern not found");
}

fs.writeFileSync("dash-drag.js", s, "utf8");
console.log("dash-drag.js updated");

// Bump version
let html = fs.readFileSync("index.html", "utf8");
html = html.replace(/dash-drag\.js\?v=\d+/g, "dash-drag.js?v=15");
fs.writeFileSync("index.html", html, "utf8");
console.log("bumped to v=15");
