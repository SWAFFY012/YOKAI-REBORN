const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");

const copyTargets = [
  "index.html",
  "styles.css",
  "script.js",
  "v_CCWildWordsRoman_v3.25.ttf",
  "public",
];

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

for (const target of copyTargets) {
  const source = path.join(root, target);
  const destination = path.join(dist, target);

  fs.cpSync(source, destination, { recursive: true });
}

console.log("Built static site into dist/");
