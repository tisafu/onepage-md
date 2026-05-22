# Runbook

## Local development

```bash
cd /Users/tisa/Projects/MD-Lens
npm install
npm run dev
```

## Smoke test

```bash
npm run smoke
```

The smoke test checks:

- critical files exist
- vendor browser files are referenced
- `marked` can render GFM tables
- HTML image tags survive Markdown parsing

## Build macOS app

```bash
npm run build
```

Output:

```text
src-tauri/target/release/bundle/macos/一页.app
```

## Create zip release

```bash
mkdir -p release
ditto -c -k --sequesterRsrc --keepParent \
  "src-tauri/target/release/bundle/macos/一页.app" \
  "release/OnePage-Tauri-vX.Y.Z.zip"
```

## Check app size

```bash
du -sh "src-tauri/target/release/bundle/macos/一页.app"
ls -lh "release/OnePage-Tauri-vX.Y.Z.zip"
```

Expected order of magnitude:

```text
.app ≈ 14MB
.zip ≈ 5MB
```

## Set as default Markdown opener

In Finder:

1. Select any `.md` file
2. `显示简介`
3. `打开方式` → choose `一页.app`
4. Click `全部更改…`

If OnePage does not appear, choose `打开方式 → 其他…` and select `一页.app` manually.

## Gatekeeper / quarantine issue

Unsigned local builds sent through WeChat, browser downloads, or AirDrop may show:

```text
“一页”已损坏，无法打开。你应该将它移到废纸篓。
```

For trusted testing only:

```bash
xattr -dr com.apple.quarantine "/path/to/一页.app"
```

For public distribution, use Apple Developer ID signing and notarization.

## GitHub

Repository:

```text
https://github.com/tisafu/onepage-md
```

Current pushed branch:

```text
tauri-rewrite
```

Push current branch:

```bash
git push origin tauri-rewrite
```

## Common troubleshooting

### Finder opens file but window does not come forward

Check `src-tauri/src/main.rs`:

- `RunEvent::Opened { urls }` is handled
- `focus_main_window_repeatedly` calls `unminimize/show/set_focus`
- macOS activation uses `open -b cn.workbuddy.onepage`

### Markdown opens but does not scroll to top

Check `src/renderer/renderer.js`:

- `#documentTop` exists in `index.html`
- `scrollDocumentToTop()` runs after render
- it uses multiple delayed scroll resets

### Code blocks are not highlighted

Check:

```text
src/renderer/vendor/highlight.min.js
src/renderer/vendor/highlight-github.min.css
src/renderer/renderer.js → highlightCodeBlocks()
```

### Task list shows extra bullets

Check `styles.css` has:

```css
.markdown-body li:has(> input[type="checkbox"]),
.markdown-body li.task-list-item {
  list-style: none;
}
```
