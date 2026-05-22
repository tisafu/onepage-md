import fs from "node:fs/promises";
import path from "node:path";
import { marked } from "marked";

const root = path.resolve(import.meta.dirname, "..");
const requiredFiles = [
  "src/renderer/index.html",
  "src/renderer/styles.css",
  "src/renderer/bridge.js",
  "src/renderer/renderer.js",
  "src/renderer/default.md",
  "src/renderer/vendor/purify.min.js",
  "src/renderer/vendor/marked.umd.js",
  "src/renderer/vendor/highlight.min.js",
  "src/renderer/vendor/highlight-github.min.css",
  "src-tauri/Cargo.toml",
  "src-tauri/tauri.conf.json",
  "src-tauri/src/main.rs",
  "src-tauri/icons/icon.png",
  "src-tauri/icons/icon.icns",
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
if (!indexHtml.includes("./vendor/highlight.min.js") || !indexHtml.includes("./vendor/highlight-github.min.css")) {
  throw new Error("renderer is not loading the bundled highlight.js files");
}
if (!indexHtml.includes("./bridge.js")) {
  throw new Error("renderer is not loading the Tauri bridge");
}

const sampleMarkdown = `# Smoke Test\n\n- item\n- **bold**\n\n| A | B |\n| --- | --- |\n| 1 | <img src="https://example.com/a.png" /> |`;
const html = marked.parse(sampleMarkdown);

if (!html.includes("<table>")) throw new Error("marked did not render GFM table");
if (!html.includes("<img")) throw new Error("marked did not keep image tag");

console.log("MD Lens smoke check passed.");
