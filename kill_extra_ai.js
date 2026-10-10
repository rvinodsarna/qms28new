const fs = require("fs");
let html = fs.readFileSync("index.html", "utf8");
const before = html.length;

// Remove the duplicate/auto-asking AI scripts
const kill = [
  /<script[^>]*ai-chat-ultimate[^>]*><\/script>/gi,
  /<script[^>]*ai-smart[^>]*><\/script>/gi,
  /<script[^>]*ai-faq-local[^>]*><\/script>/gi,
  /<script[^>]*ai-faq\.js[^>]*><\/script>/gi
];

kill.forEach(function (p) { html = html.replace(p, ""); });

fs.writeFileSync("index.html", html, "utf8");
console.log("removed", before - html.length, "chars");
console.log("ai-chat-ultimate still there:", html.includes("ai-chat-ultimate"));
console.log("ai-smart still there:", html.includes("ai-smart"));
console.log("ai-faq-local still there:", html.includes("ai-faq-local"));
console.log("ai-faq still there:", /ai-faq\.js/.test(html));
console.log("ai-chat.js kept:", html.includes("ai-chat.js"));
