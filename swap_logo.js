const fs = require("fs");
let html = fs.readFileSync("index.html", "utf8");

// Find the current static JPG logo img tag
const imgPattern = /<img[^>]*src="\.\/QMS_LOGO\.jpg"[^>]*>/;
const currentImg = html.match(imgPattern);

if (!currentImg) {
  console.log("no QMS_LOGO.jpg img found — showing all logo tags:");
  console.log((html.match(/<img[^>]*QMS_LOGO[^>]*>/g) || []).join("\n"));
  console.log("(video tags:)", (html.match(/<video[^>]*QMS_LOGO[^>]*>/g) || []).join("\n"));
  process.exit(1);
}

console.log("found:", currentImg[0].slice(0, 120) + "...");

// Replace with video element
const videoTag = '<video src="./QMS_LOGO.webm" autoplay loop muted playsinline style="width:100%;height:100%;object-fit:contain;border-radius:4px;" onerror="this.style.display=\'none\';this.parentNode.textContent=\'Q\';"></video>';

html = html.replace(imgPattern, videoTag);

fs.writeFileSync("index.html", html, "utf8");
console.log("logo swapped to WebM video");
console.log("has QMS_LOGO.webm in HTML:", html.includes("QMS_LOGO.webm"));
console.log("still has QMS_LOGO.jpg:", html.includes("QMS_LOGO.jpg"));
