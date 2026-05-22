# 一页 OnePage

一页是一个极简 Markdown 阅读器：不建仓库、不管理文件，只打开当前这一页。

当前主线是 **Tauri 2** 版。Electron 原型保留在 Git 历史中，不再作为主线继续开发。

## 功能

- 打开单个 Markdown / 文本文档：`.md`、`.markdown`、`.mdown`、`.mkd`、`.txt`
- 使用 `marked` 渲染 GFM Markdown
- 使用 `DOMPurify` 清洗 HTML
- 使用 `highlight.js` 做代码块语法高亮
- 自动生成左侧标题目录
- 支持文档内搜索、刷新、在 Finder 查看
- 支持 macOS Finder 双击 / “打开方式” 打开 Markdown 文件
- 右下角显示字数、文件大小、修改时间

明确不做：vault、文件树、附件管理、数据库、知识图谱、多标签。

## 项目结构

```text
src/renderer/                 前端 UI 与 Markdown 渲染
src/renderer/index.html       页面结构
src/renderer/styles.css       阅读样式
src/renderer/renderer.js      渲染、TOC、搜索、状态更新
src/renderer/bridge.js        Tauri 前端桥接
src/renderer/default.md       内置演示文档
src/renderer/vendor/          前端运行时 vendor 文件
src-tauri/                    Tauri / Rust 外壳
src-tauri/src/main.rs         文件打开、读取、Finder 定位、file association 事件
src-tauri/tauri.conf.json     Tauri 配置和 macOS 文件关联
build/                        图标源文件
scripts/smoke-check.mjs       冒烟验证
```

## 开发

```bash
npm install
npm run dev
```

开发时主要改：

```text
src/renderer/styles.css
src/renderer/renderer.js
src/renderer/index.html
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

打包产物：

```text
src-tauri/target/release/bundle/macos/一页.app
```

压缩分发：

```bash
mkdir -p release
ditto -c -k --sequesterRsrc --keepParent \
  "src-tauri/target/release/bundle/macos/一页.app" \
  "release/OnePage-Tauri-vX.Y.Z.zip"
```

## macOS 分发注意

当前包是本地 ad-hoc 签名，发给别人后可能被 Gatekeeper 提示“已损坏，无法打开”。这通常不是 zip 损坏，而是 quarantine / 未 notarized。

受信任测试用户可临时执行：

```bash
xattr -dr com.apple.quarantine "/path/to/一页.app"
```

正式公开发布需要 Apple Developer ID 签名和 notarization。

## GitHub

公开仓库：

```text
https://github.com/tisafu/onepage-md
```

当前开发分支：

```text
tauri-rewrite
```
