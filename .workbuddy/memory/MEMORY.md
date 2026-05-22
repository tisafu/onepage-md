# OnePage project memory

Last updated: 2026-05-22

## Project identity

- Product name: 一页 / OnePage.
- Repository: `https://github.com/tisafu/onepage-md`.
- Local project path: `/Users/tisa/Projects/MD-Lens`.
- Current main development branch: `tauri-rewrite`.
- Product boundary: single-document Markdown reader. No vault, no file tree, no attachment management, no database, no graph, no tabs.

## Current technical direction

- Current implementation is Tauri 2 + Rust + plain HTML/CSS/JS.
- Electron was used as a prototype and remains only in Git history.
- Frontend intentionally avoids React/Vue and heavy state frameworks.
- Runtime browser libraries are vendored under `src/renderer/vendor/` to keep the app bundle small.
- Current app size target is approximately 14MB `.app` and 5MB `.zip`.

## Important implementation facts

- `src-tauri/src/main.rs` owns native file operations:
  - open file dialog
  - read Markdown file payload
  - reveal file in Finder
  - handle macOS Finder double-click / Open With via `RunEvent::Opened { urls }`
  - force app foreground focus with `unminimize/show/set_focus` and `open -b cn.workbuddy.onepage`
- `src/renderer/bridge.js` exposes the Tauri bridge as `window.mdLens`.
- `src/renderer/renderer.js` owns render behavior: marked, DOMPurify, highlight.js, TOC, search, refresh, scroll reset.
- `src/renderer/styles.css` owns the reading UI and Markdown typography.
- `src/renderer/default.md` is the built-in demo document.
- Drag-and-drop opening was removed after repeated Tauri/macOS instability; do not reintroduce unless there is a verified new implementation.

## Distribution caveat

- Current releases are not Apple Developer ID signed or notarized.
- If sent through WeChat/browser/AirDrop, macOS may show “一页已损坏，无法打开”. This is usually Gatekeeper quarantine, not a corrupted zip.
- Trusted test users can run:

```bash
xattr -dr com.apple.quarantine "/path/to/一页.app"
```

- Public distribution requires Developer ID signing and notarization.

## Commands

```bash
cd /Users/tisa/Projects/MD-Lens
npm install
npm run dev
npm run smoke
npm run build
```

Zip release:

```bash
mkdir -p release
ditto -c -k --sequesterRsrc --keepParent \
  "src-tauri/target/release/bundle/macos/一页.app" \
  "release/OnePage-Tauri-vX.Y.Z.zip"
```

## Documentation map

- `AGENTS.md`: AI/operator rules and project boundaries.
- `README.md`: human-facing setup, commands, distribution notes.
- `docs/ARCHITECTURE.md`: implementation architecture.
- `docs/RUNBOOK.md`: build, release, and troubleshooting steps.
