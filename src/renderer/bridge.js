const fileOpenedListeners = new Set();
const fileErrorListeners = new Set();

const tauriApi = window.__TAURI__;
const invoke = tauriApi?.core?.invoke;
const listen = tauriApi?.event?.listen;

function notifyFileOpened(file) {
  fileOpenedListeners.forEach((callback) => callback(file));
}

function notifyFileError(payload) {
  fileErrorListeners.forEach((callback) => callback(payload));
}

function dispatchDragState(type) {
  window.dispatchEvent(new CustomEvent(type));
}

if (listen) {
  listen("tauri://drag-enter", () => dispatchDragState("onepage-drag-enter"));
  listen("tauri://drag-leave", () => dispatchDragState("onepage-drag-leave"));
  listen("tauri://drag-drop", async (event) => {
    dispatchDragState("onepage-drag-leave");
    const path = event.payload?.paths?.[0];
    if (!path) return;

    try {
      const file = await invoke("read_markdown_file", { path });
      notifyFileOpened(file);
    } catch (error) {
      notifyFileError({ path, message: String(error) });
    }
  });
}

window.mdLens = {
  openFileDialog: () => invoke("open_file_dialog"),
  readFile: (path) => invoke("read_markdown_file", { path }),
  revealFile: (path) => invoke("reveal_file", { path }),
  getPathForFile: (file) => file?.path || "",
  onFileOpened: (callback) => {
    fileOpenedListeners.add(callback);
    return () => fileOpenedListeners.delete(callback);
  },
  onFileError: (callback) => {
    fileErrorListeners.add(callback);
    return () => fileErrorListeners.delete(callback);
  }
};
