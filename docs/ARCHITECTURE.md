# Architecture

## Overview

OnePage is a small Tauri 2 app that reads one Markdown document at a time. The frontend is plain HTML/CSS/JavaScript. The backend is a minimal Rust shell for native file operations.

```text
Finder / open dialog
        ↓
src-tauri/src/main.rs
        ↓ command payload
src/renderer/bridge.js
        ↓ window.mdLens API
src/renderer/renderer.js
        ↓
marked + DOMPurify + highlight.js
        ↓
reading UI
```

## Frontend

### `src/renderer/index.html`

Defines the app shell:

- top bar with document name/path and action buttons
- left TOC panel
- document stage
- right-bottom stats
- vendor scripts

### `src/renderer/styles.css`

Owns the visual identity:

- Chinese reading typography
- heading rhythm
- quote, table, task-list, code-block styles
- top bar and status UI

### `src/renderer/renderer.js`

Owns browser-side behavior:

- Markdown rendering via `marked`
- HTML sanitization via `DOMPurify`
- code highlighting via `highlight.js`
- TOC generation
- search highlight
- file refresh polling
- scroll reset after rendering

### `src/renderer/bridge.js`

Provides the frontend API used by `renderer.js`:

```js
window.mdLens.openFileDialog()
window.mdLens.openedFiles()
window.mdLens.readFile(path)
window.mdLens.revealFile(path)
window.mdLens.onFileOpened(callback)
window.mdLens.onFileError(callback)
```

## Tauri backend

### `src-tauri/src/main.rs`

Rust responsibilities:

- open file dialog
- read Markdown file metadata and content
- reveal current file in Finder
- receive macOS file-open events from Finder / Open With
- bring the window to the foreground when opened via Finder

Important commands:

```rust
open_file_dialog()
opened_files(app)
read_markdown_file(path)
reveal_file(path)
```

## File-open flow

### Button open

```text
button click
→ bridge.openFileDialog
→ Rust open_file_dialog
→ FilePayload
→ renderMarkdown
```

### Finder double-click / Open With

```text
macOS opens file with OnePage
→ Tauri RunEvent::Opened { urls }
→ store paths in OpenedFiles state
→ emit opened-file event
→ bridge reads path
→ renderMarkdown
```

Cold start is handled by `opened_files()` because the open event can arrive before the webview is ready.

## Packaging

Tauri packages only the app frontend and Rust binary. Browser runtime dependencies are vendored manually:

```text
src/renderer/vendor/marked.umd.js
src/renderer/vendor/purify.min.js
src/renderer/vendor/highlight.min.js
src/renderer/vendor/highlight-github.min.css
```

This avoids packaging full `node_modules`.

Current macOS app size is about 14MB, and zip size is about 5MB.

## Known constraints

- Drag-and-drop opening was removed because it remained unreliable in Tauri/macOS testing.
- Distribution builds are not Developer ID signed or notarized yet.
- Remote images may fail if the remote server blocks external access.
