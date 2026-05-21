import fs from "node:fs/promises";
import path from "node:path";
import { marked } from "marked";

const root = path.resolve(import.meta.dirname, "..");
const requiredFiles = [
  "src/main.js",
  "src/preload.cjs",
  "src/renderer/index.html",
  "src/renderer/styles.css",
  "src/renderer/renderer.js",
  "src/renderer/vendor/purify.min.js",
  "src/renderer/vendor/marked.umd.js",
  "build/icon.png",
  "build/icon.icns"
];

for (const file of requiredFiles) {
  await fs.access(path.join(root, file));
}

const indexHtml = await fs.readFile(path.join(root, "src/renderer/index.html"), "utf-8");
if (!indexHtml.includes("./vendor/marked.umd.js")) {
  throw new Error("renderer is not loading the bundled marked UMD file");
}
if (!indexHtml.includes("./vendor/purify.min.js")) {
  throw new Error("renderer is not loading the bundled DOMPurify file");
}

const sampleMarkdown = `# Smoke Test\n\n- item\n- **bold**\n\n| A | B |\n| --- | --- |\n| 1 | <img src="https://example.com/a.png" /> |`;
const html = marked.parse(sampleMarkdown);

if (!html.includes("<table>")) throw new Error("marked did not render GFM table");
if (!html.includes("<img")) throw new Error("marked did not keep image tag");

console.log("MD Lens smoke check passed.");
