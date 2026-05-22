# AGENTS.md

## 项目定位

一页 OnePage 是一个 Tauri 2 单文档 Markdown 阅读器。产品边界是：不建仓库、不管理文件、不做文件树，只打开当前这一页。

## 当前主线

- 当前主线：Tauri 2。
- 当前分支：`tauri-rewrite`。
- GitHub：`https://github.com/tisafu/onepage-md`。
- Electron 版只保留在 Git 历史中，不作为主线继续开发。

## 常用命令

```bash
npm install
npm run dev
npm run smoke
npm run build
```

打包产物：

```text
src-tauri/target/release/bundle/macos/一页.app
```

压缩发布包：

```bash
mkdir -p release
ditto -c -k --sequesterRsrc --keepParent \
  "src-tauri/target/release/bundle/macos/一页.app" \
  "release/OnePage-Tauri-vX.Y.Z.zip"
```

## 关键文件

| 路径 | 职责 |
| --- | --- |
| `src/renderer/index.html` | 页面结构 |
| `src/renderer/styles.css` | 阅读 UI 与 Markdown 样式 |
| `src/renderer/renderer.js` | Markdown 渲染、TOC、搜索、状态栏、刷新 |
| `src/renderer/bridge.js` | 前端调用 Tauri command 的桥接层 |
| `src/renderer/default.md` | 内置演示文档 |
| `src/renderer/vendor/` | vendored browser runtime 文件 |
| `src-tauri/src/main.rs` | Rust command、文件读取、Finder 定位、macOS file-open 事件 |
| `src-tauri/tauri.conf.json` | Tauri 窗口、bundle、fileAssociations 配置 |
| `scripts/smoke-check.mjs` | 冒烟检查 |

## 功能边界

当前支持：

- 通过按钮打开单个 `.md/.markdown/.mdown/.mkd/.txt` 文件。
- Finder 双击 / “打开方式” 打开 Markdown。
- GFM Markdown 渲染。
- DOMPurify HTML 清洗。
- highlight.js 代码块高亮。
- 自动 TOC。
- 文档内搜索。
- 刷新当前文件。
- 在 Finder 查看当前文件。
- 右下角字数、文件大小、修改时间。

当前不支持 / 不保留：

- 拖拽打开文件。Tauri 版 macOS 拖拽不稳定，已明确移除，不要恢复破损 UI。
- 编辑模式。
- 多标签。
- vault / 文件树 / 附件管理 / 数据库 / 图谱。

## 重要实现约定

- 前端不引入 React / Vue 等框架，保持原生 HTML/CSS/JS。
- Markdown 运行时库 vendored 到 `src/renderer/vendor/`，不要把整个 `node_modules` 打进包体。
- macOS 文件关联只靠 `tauri.conf.json` 不够；还必须在 Rust 侧处理 `RunEvent::Opened { urls }`。
- 打开文件后需要前台显示：Rust 侧使用 `unminimize/show/set_focus`，并用 `open -b cn.workbuddy.onepage` 延迟重试激活。
- 新文件渲染后回顶部用 `#documentTop` anchor + 多轮 scroll reset；不要只调用一次 `scrollTo(0,0)`。
- 远程图片如果返回 403，不是渲染器问题；不要用阅读器层面硬绕过。

## macOS 分发注意

当前 release 未 Developer ID 签名 / 未 notarized。通过 WeChat、浏览器、AirDrop 分发给别人时，macOS 可能提示“已损坏，无法打开”。这通常是 Gatekeeper quarantine，不是文件真的损坏。

测试用户可临时执行：

```bash
xattr -dr com.apple.quarantine "/path/to/一页.app"
```

正式公开发布需要 Apple Developer ID signing + notarization。

## 文档同步规则

- 修改运行方式、打包方式、分发方式时，同步更新 `README.md`。
- 修改项目边界、踩坑、架构约定时，同步更新本文件。
- 长期项目记忆写入 `.workbuddy/memory/MEMORY.md`。
