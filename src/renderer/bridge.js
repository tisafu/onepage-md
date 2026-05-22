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

async function openPath(path) {
  if (!path) return;

  try {
    const file = await invoke("read_markdown_file", { path });
    notifyFileOpened(file);
  } catch (error) {
    notifyFileError({ path, message: String(error) });
  }
}

async function openFirstPath(paths) {
  if (!Array.isArray(paths) || !paths[0]) return;
  await openPath(paths[0]);
}

if (listen) {
  listen("opened-file", async (event) => {
    await openFirstPath(event.payload);
  });
}

window.mdLens = {
  openFileDialog: () => invoke("open_file_dialog"),
  openedFiles: () => invoke("opened_files"),
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
