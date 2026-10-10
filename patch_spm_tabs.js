const fs = require("fs");
const path = "app.js";
let src = fs.readFileSync(path, "utf8");
const before = src;

// The BDS button — match on the stable parts, ignore the mojibake em-dash
const BDS_BUTTON_RE = /(<button class="spdd-prog-tab" data-prog="BDS">BDS[^<]*<\/button>)/;

if (!BDS_BUTTON_RE.test(src)) {
  console.error("❌ Could not find the BDS prog-tab button.");
  console.error("   Search app.js manually for: data-prog=\"BDS\"");
  process.exit(1);
}

// Already patched?
if (src.includes('data-prog="DCY"')) {
  console.log("ℹ️  DCY tab already present — skipping insert");
  process.exit(0);
}

const NEW_TABS =
  '$1\n' +
  '                            <button class="spdd-prog-tab" data-prog="DCY">DCY – Diploma in Cybersecurity</button>\n' +
  '                            <button class="spdd-prog-tab" data-prog="DIT">DIT – Diploma in Info Tech</button>';

src = src.replace(BDS_BUTTON_RE, NEW_TABS);

// Also relax the role check so lecturers/admins can use it (optional)
// — skip this if you want to keep HOP+Dean only.

if (src === before) {
  console.error("❌ No change made");
  process.exit(1);
}

fs.writeFileSync(path, src, "utf8");
console.log("✅ app.js patched: DCY + DIT tabs added");