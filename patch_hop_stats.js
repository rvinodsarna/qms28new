const fs = require("fs");
const path = "hop-stats.js";
let src = fs.readFileSync(path, "utf8");
const before = src;

// ── Replace the student query block ──
const OLD_QUERY_RE = /var progRes = await sb\(\)\.from\("students"\)[\s\S]*?out\.avgPoints = out\.socsi > 0 \? \(sumPts \/ out\.socsi\)\.toFixed\(1\) : "0\.0";[\s\S]*?\n    \}/;

const NEW_QUERY = `var progRes = await sb().from("sp_students")
      .select("programme")
      .in("programme", PROGRAMMES);

    if (!progRes.error && progRes.data) {
      out.socsi = progRes.data.length;
      progRes.data.forEach(function(r){
        if (out.byProg[r.programme] !== undefined) out.byProg[r.programme]++;
      });
    }

    // Fetch RISE points separately from rise_points table
    var ptsRes = await sb().from("rise_points").select("student_id, pts");
    if (!ptsRes.error && ptsRes.data) {
      var sumPts = ptsRes.data.reduce(function(s, r) { return s + Number(r.pts || 0); }, 0);
      out.sumPoints = sumPts;
      out.avgPoints = out.socsi > 0 ? (sumPts / out.socsi).toFixed(1) : "0.0";
    }`;

if (!OLD_QUERY_RE.test(src)) {
  console.error("❌ Could not find the student query block to replace");
  console.error("   Searching for 'from(\"students\")' manually...");
  var idx = src.indexOf('from("students")');
  if (idx >= 0) {
    console.error("   Found at char " + idx + " — context:");
    console.error("   " + src.slice(Math.max(0, idx - 100), idx + 400).replace(/\n/g, "\n   "));
  }
  process.exit(1);
}

src = src.replace(OLD_QUERY_RE, NEW_QUERY);

if (src === before) {
  console.error("❌ No change made");
  process.exit(1);
}

fs.writeFileSync(path, src, "utf8");
console.log("✅ hop-stats.js patched: sp_students + rise_points");