const { contextBridge, ipcRenderer, webUtils } = require("electron");

contextBridge.exposeInMainWorld("mdLens", {
  openFileDialog: () => ipcRenderer.invoke("open-file-dialog"),
  readFile: (filePath) => ipcRenderer.invoke("read-file", filePath),
  revealFile: (filePath) => ipcRenderer.invoke("reveal-file", filePath),
  getPathForFile: (file) => webUtils.getPathForFile(file),
  onFileOpened: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("file-opened", listener);
    return () => ipcRenderer.removeListener("file-opened", listener);
  },
  onFileError: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("file-error", listener);
    return () => ipcRenderer.removeListener("file-error", listener);
  }
});
