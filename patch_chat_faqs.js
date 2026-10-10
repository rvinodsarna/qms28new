const fs = require("fs");
let s = fs.readFileSync("ai-chat.js", "utf8");

// 1. Add a second FAQ source
if (!s.includes("faqs-students.json")) {
  const oldFetch = 'fetch("faqs-1000.json", { cache: "force-cache" })';
  const newFetch = `fetch("faqs-students.json", { cache: "force-cache" }).then(function(r){
          if (!r.ok) throw new Error("no student json");
          return r.json();
        }).then(function(studentData){
          if (Array.isArray(studentData)) {
            // Normalise: student FAQs use short keys
            studentData.forEach(function(f){
              faqs.push({
                question: f.question || f.q || "",
                answer: f.answer || f.a || "",
                category: f.category || f.c || "Student",
                keywords: f.keywords || f.k || []
              });
            });
            buildIndex();
            console.log("[ai-chat] +" + studentData.length + " student FAQs");
          }
          return fetch("faqs-1000.json", { cache: "force-cache" });
        }).then(function(r){
          if (!r || !r.ok) throw new Error("no json");
          return r.json();`;
  if (s.includes(oldFetch)) {
    s = s.replace(oldFetch, newFetch);
    console.log("patched: student FAQ loader added");
  } else {
    console.log("WARN: fetch faqs-1000.json not found exactly");
  }
}

// 2. Include keywords in the index
s = s.replace(
  /var txt = \(f\.question\|\|""\) \+ " " \+ \(f\.answer\|\|""\) \+ " " \+ \(f\.category\|\|""\);/,
  'var txt = (f.question||"") + " " + (f.answer||"") + " " + (f.category||"") + " " + ((f.keywords||[]).join(" "));'
);

s = s.replace(
  /var fToks = tokenize\(\(f\.question\|\|""\) \+ " " \+ \(f\.answer\|\|""\)\);/,
  'var fToks = tokenize((f.question||"") + " " + (f.answer||"") + " " + ((f.keywords||[]).join(" ")));'
);

fs.writeFileSync("ai-chat.js", s, "utf8");
console.log("patched ai-chat.js");
