# 一页 OnePage

极简 Markdown 阅读器：不建仓库、不管理文件，只打开当前这一页。

## 功能

- 打开或拖入单个 Markdown 文件
- 使用 `marked` 渲染 GFM Markdown
- 使用 `DOMPurify` 清洗 HTML
- 自动生成标题目录
- 支持文档内搜索、刷新、在 Finder 查看
- 开发模式下修改 `src/renderer` 会自动刷新窗口

## 开发

```bash
npm install
npm run dev
```

开发模式会自动打开 DevTools，并监听：

```text
src/renderer/styles.css
src/renderer/index.html
src/renderer/renderer.js
```

保存后窗口会自动刷新。

## 验证

```bash
npm run smoke
```

## 打包

```bash
npm run pack:mac
```

打包产物在：

```text
release/mac-arm64/一页.app
```

如果要压缩分发：

```bash
ditto -c -k --sequesterRsrc --keepParent "release/mac-arm64/一页.app" "release/OnePage-vX.Y.Z.zip"
```

## 包体说明

运行时依赖的前端库已经 vendored 到：

```text
src/renderer/vendor/
```

因此打包配置只包含：

```text
src/**/*
build/icon.png
package.json
```

`node_modules/`、`release/`、`build/icon.iconset/` 都不进入源码管理。
