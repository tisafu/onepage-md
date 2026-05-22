const fileOpenedListeners = new Set();
const fileErrorListeners = new Set();

const tauriApi = window.__TAURI__;
const invoke = tauriApi?.core?.invoke;

function notifyFileOpened(file) {
  fileOpenedListeners.forEach((callback) => callback(file));
}

function notifyFileError(payload) {
  fileErrorListeners.forEach((callback) => callback(payload));
}

window.mdLens = {
  openFileDialog: () => invoke("open_file_dialog"),
  readFile: (path) => invoke("read_markdown_file", { path }),
  revealFile: (path) => invoke("reveal_file", { path }),
  onFileOpened: (callback) => {
    fileOpenedListeners.add(callback);
    return () => fileOpenedListeners.delete(callback);
  },
  onFileError: (callback) => {
    fileErrorListeners.add(callback);
    return () => fileErrorListeners.delete(callback);
  }
};
