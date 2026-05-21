# 一页 OnePage

极简 Markdown 阅读器：不建仓库、不管理文件，只打开当前这一页。

## 功能

- 打开或拖入单个 Markdown 文件
- 使用 `marked` 渲染 GFM Markdown
- 使用 `DOMPurify` 清洗 HTML
- 自动生成标题目录
- 支持文档内搜索、刷新、在 Finder 查看
- Tauri 版使用系统 WebView，包体和启动速度明显优于 Electron 原型

## 开发

```bash
npm install
npm run dev
```

当前开发模式由 Tauri 启动。前端文件在：

```text
src/renderer/
```

主要文件：

```text
src/renderer/index.html
src/renderer/styles.css
src/renderer/bridge.js
src/renderer/renderer.js
src-tauri/src/main.rs
```

## 验证

```bash
npm run smoke
```

## 打包

```bash
npm run build
```

打包产物在：

```text
src-tauri/target/release/bundle/macos/一页.app
```

如果要压缩分发：

```bash
ditto -c -k --sequesterRsrc --keepParent "src-tauri/target/release/bundle/macos/一页.app" "release/OnePage-Tauri-vX.Y.Z.zip"
```

## 包体说明

运行时前端库 vendored 到：

```text
src/renderer/vendor/
```

Tauri 配置在：

```text
src-tauri/tauri.conf.json
```

Electron 原型已由 Git 历史保留，当前主线是 Tauri。
