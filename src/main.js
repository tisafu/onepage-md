import { app, BrowserWindow, dialog, ipcMain, Menu, shell } from "electron";
import { watch } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.platform === "darwin") {
  app.commandLine.appendSwitch("use-mock-keychain");
}

const isDevMode = process.env.MD_LENS_DEV === "1" || process.argv.includes("--dev");
let mainWindow;
let pendingOpenFile = null;
let devReloadWatcher = null;
let devReloadTimer = null;

function isMarkdownFile(filePath) {
  return /\.(md|markdown|mdown|mkd|txt)$/i.test(filePath || "");
}

function getFileFromArgv(argv) {
  return argv.find((arg) => {
    if (!arg || arg.startsWith("-")) return false;
    return isMarkdownFile(arg);
  });
}

function setupDevReload() {
  if (!isDevMode || devReloadWatcher) return;

  const rendererDir = path.join(__dirname, "renderer");
  devReloadWatcher = watch(rendererDir, { recursive: false }, (_eventType, filename) => {
    if (!filename || !/\.(css|html|js)$/i.test(filename)) return;
    clearTimeout(devReloadTimer);
    devReloadTimer = setTimeout(() => {
      if (!mainWindow || mainWindow.isDestroyed()) return;
      mainWindow.webContents.reloadIgnoringCache();
    }, 120);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 860,
    minWidth: 760,
    minHeight: 560,
    title: "一页",
    backgroundColor: "#f7f7f5",
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 20, y: 17 },
    icon: path.join(__dirname, "..", "build", "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));

  if (isDevMode) {
    mainWindow.webContents.once("dom-ready", () => {
      mainWindow.webContents.openDevTools({ mode: "detach" });
    });
    setupDevReload();
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.once("did-finish-load", () => {
    const initialFile = pendingOpenFile || getFileFromArgv(process.argv);
    if (initialFile) openMarkdownFile(initialFile);
  });
}

async function readMarkdownFile(filePath) {
  const normalizedPath = path.resolve(filePath);
  const stat = await fs.stat(normalizedPath);
  if (!stat.isFile()) {
    throw new Error("不是可读取的文件");
  }

  const content = await fs.readFile(normalizedPath, "utf-8");
  return {
    path: normalizedPath,
    name: path.basename(normalizedPath),
    dir: path.dirname(normalizedPath),
    size: stat.size,
    modifiedAt: stat.mtime.toISOString(),
    content
  };
}

async function openMarkdownFile(filePath) {
  try {
    const payload = await readMarkdownFile(filePath);
    pendingOpenFile = payload.path;
    app.addRecentDocument(payload.path);

    if (mainWindow) {
      mainWindow.setTitle(`${payload.name} — 一页`);
      mainWindow.webContents.send("file-opened", payload);
    }

    return payload;
  } catch (error) {
    if (mainWindow) {
      mainWindow.webContents.send("file-error", {
        message: error.message || "文件读取失败",
        path: filePath
      });
    }
    throw error;
  }
}

function buildMenu() {
  const template = [
    ...(process.platform === "darwin"
      ? [{
          label: app.name,
          submenu: [
            { role: "about" },
            { type: "separator" },
            { role: "services" },
            { type: "separator" },
            { role: "hide" },
            { role: "hideOthers" },
            { role: "unhide" },
            { type: "separator" },
            { role: "quit" }
          ]
        }]
      : []),
    {
      label: "文件",
      submenu: [
        {
          label: "打开 Markdown...",
          accelerator: "CmdOrCtrl+O",
          click: async () => {
            if (!mainWindow) return;
            const result = await dialog.showOpenDialog(mainWindow, {
              title: "打开 Markdown 文件",
              properties: ["openFile"],
              filters: [
                { name: "Markdown", extensions: ["md", "markdown", "mdown", "mkd", "txt"] },
                { name: "All Files", extensions: ["*"] }
              ]
            });

            if (!result.canceled && result.filePaths[0]) {
              openMarkdownFile(result.filePaths[0]);
            }
          }
        },
        { role: "recentDocuments", submenu: [{ role: "clearRecentDocuments" }] },
        { type: "separator" },
        { role: "close" }
      ]
    },
    {
      label: "编辑",
      submenu: [
        { role: "copy" },
        { role: "selectAll" },
        { type: "separator" },
        { role: "find" }
      ]
    },
    {
      label: "视图",
      submenu: [
        { role: "reload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" }
      ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

ipcMain.handle("open-file-dialog", async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "打开 Markdown 文件",
    properties: ["openFile"],
    filters: [
      { name: "Markdown", extensions: ["md", "markdown", "mdown", "mkd", "txt"] },
      { name: "All Files", extensions: ["*"] }
    ]
  });

  if (result.canceled || !result.filePaths[0]) return null;
  return openMarkdownFile(result.filePaths[0]);
});

ipcMain.handle("read-file", async (_event, filePath) => {
  return readMarkdownFile(filePath);
});

ipcMain.handle("reveal-file", async (_event, filePath) => {
  if (filePath) shell.showItemInFolder(filePath);
});

app.setName("一页");

app.on("open-file", (event, filePath) => {
  event.preventDefault();
  pendingOpenFile = filePath;
  if (mainWindow) openMarkdownFile(filePath);
});

app.whenReady().then(() => {
  pendingOpenFile = getFileFromArgv(process.argv) || pendingOpenFile;
  buildMenu();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("before-quit", () => {
  devReloadWatcher?.close();
  clearTimeout(devReloadTimer);
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
