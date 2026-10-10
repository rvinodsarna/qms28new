const fs = require("fs");
let s = fs.readFileSync("ai-chat.js", "utf8");

if (s.includes("killLegacyChat")) {
  console.log("already has kill switch");
  process.exit(0);
}

const killCode = [
  "",
  "  /* ---------- Remove legacy AI drawer from app.js ---------- */",
  "  function killLegacyChat() {",
  "    ['ai-drawer-box','ai-fab-root'].forEach(function(id){",
  "      var el = document.getElementById(id);",
  "      if (el && el.parentNode) el.parentNode.removeChild(el);",
  "    });",
  "    document.querySelectorAll('[id^=\"ai-drawer\"],[id^=\"ai-fab\"]').forEach(function(el){",
  "      if (el.id !== 'ai-chat-panel' && el.id !== 'ai-chat-launcher') {",
  "        el.style.display = 'none';",
  "      }",
  "    });",
  "  }",
  "  killLegacyChat();",
  "  new MutationObserver(killLegacyChat).observe(document.body, { childList: true, subtree: true });",
  ""
].join("\n");

// Insert before the final })();
s = s.replace(/\}\)\(\);\s*$/, killCode + "\n})();\n");
fs.writeFileSync("ai-chat.js", s, "utf8");
console.log("kill switch added");
