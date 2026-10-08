const fs = require("fs");
let s = fs.readFileSync("ai-chat.js", "utf8");

if (s.includes("loadStudentFaqs")) {
  console.log("already patched");
  process.exit(0);
}

// Find the final })(); and inject our code before it
const inject = `

  /* ============ Student FAQ loader (append) ============ */
  function loadStudentFaqs() {
    return fetch("faqs-students.json", { cache: "force-cache" })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (arr) {
        if (!Array.isArray(arr) || !arr.length) return;
        arr.forEach(function (f) {
          faqs.push({
            question: f.question || "",
            answer:   f.answer   || "",
            category: f.category || "Student",
            keywords: f.keywords || []
          });
        });
        buildIndex();
        console.log("[ai-chat] +" + arr.length + " student FAQs");
        renderSuggestions();
      })
      .catch(function (e) { console.warn("[ai-chat] student FAQs:", e.message); });
  }

  // Kick off the student loader once the main loader resolves
  var __origLoadFaqs = loadFaqs;
  loadFaqs = function () {
    return __origLoadFaqs().then(loadStudentFaqs);
  };
`;

// Insert before the last })();
const endIdx = s.lastIndexOf("})();");
if (endIdx < 0) { console.log("ERROR: end marker not found"); process.exit(1); }
s = s.slice(0, endIdx) + inject + "\n" + s.slice(endIdx);
fs.writeFileSync("ai-chat.js", s, "utf8");
console.log("student FAQ loader appended");
