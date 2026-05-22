const fileOpenedListeners = new Set();
const fileErrorListeners = new Set();

const tauriApi = window.__TAURI__;
const invoke = tauriApi?.core?.invoke;
const listen = tauriApi?.event?.listen;
const getCurrentWebview = tauriApi?.webview?.getCurrentWebview;

function notifyFileOpened(file) {
  fileOpenedListeners.forEach((callback) => callback(file));
}

function notifyFileError(payload) {
  fileErrorListeners.forEach((callback) => callback(payload));
}

function dispatchDragState(type) {
  window.dispatchEvent(new CustomEvent(type));
}

function getDroppedPath(payload) {
  if (!payload) return "";
  if (typeof payload === "string") return payload;
  if (Array.isArray(payload)) return payload[0] || "";
  if (Array.isArray(payload.paths)) return payload.paths[0] || "";
  if (typeof payload.path === "string") return payload.path;
  return "";
}

async function openDroppedPath(path) {
  if (!path) return;

  try {
    const file = await invoke("read_markdown_file", { path });
    notifyFileOpened(file);
  } catch (error) {
    notifyFileError({ path, message: String(error) });
  }
}

async function setupWebviewDragDrop() {
  if (!getCurrentWebview) return false;

  const webview = getCurrentWebview();
  if (!webview?.onDragDropEvent) return false;

  await webview.onDragDropEvent(async (event) => {
    const payload = event.payload;
    if (payload?.type === "over") {
      dispatchDragState("onepage-drag-enter");
      return;
    }

    if (payload?.type === "cancel") {
      dispatchDragState("onepage-drag-leave");
      return;
    }

    if (payload?.type === "drop") {
      dispatchDragState("onepage-drag-leave");
      await openDroppedPath(getDroppedPath(payload));
    }
  });

  return true;
}

async function setupLegacyDragDropFallback() {
  if (!listen) return;

  await listen("tauri://drag-enter", () => dispatchDragState("onepage-drag-enter"));
  await listen("tauri://drag-over", () => dispatchDragState("onepage-drag-enter"));
  await listen("tauri://drag-leave", () => dispatchDragState("onepage-drag-leave"));
  await listen("tauri://drag-drop", async (event) => {
    dispatchDragState("onepage-drag-leave");
    await openDroppedPath(getDroppedPath(event.payload));
  });
}

setupWebviewDragDrop()
  .then((enabled) => {
    if (!enabled) return setupLegacyDragDropFallback();
  })
  .catch(() => setupLegacyDragDropFallback());

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
