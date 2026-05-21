const state = {
  file: null,
  rawMarkdown: "",
  renderedHtml: "",
  watcherTimer: null,
  toastTimer: null
};

const elements = {
  topbarDocInfo: document.querySelector(".topbar-doc-info"),
  toolbar: document.querySelector(".toolbar"),
  floatingStats: document.querySelector(".floating-stats"),
  openButton: document.getElementById("openButton"),
  refreshButton: document.getElementById("refreshButton"),
  revealButton: document.getElementById("revealButton"),
  reader: document.getElementById("reader"),
  document: document.getElementById("document"),
  toc: document.getElementById("toc"),
  docTitle: document.getElementById("docTitle"),
  docPath: document.getElementById("docPath"),
  wordCount: document.getElementById("wordCount"),
  modifiedAt: document.getElementById("modifiedAt"),
  dropOverlay: document.getElementById("dropOverlay"),
  toast: document.getElementById("toast"),
  searchBar: document.getElementById("searchBar"),
  searchInput: document.getElementById("searchInput"),
  closeSearchButton: document.getElementById("closeSearchButton")
};

marked.setOptions({
  gfm: true,
  breaks: false,
  mangle: false,
  headerIds: false
});

function showToast(message) {
  window.clearTimeout(state.toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");
  state.toastTimer = window.setTimeout(() => {
    elements.toast.classList.remove("is-visible");
  }, 2600);
}

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatDate(isoString) {
  if (!isoString) return "未修改";

  const date = new Date(isoString);
  const now = new Date();
  const isToday = date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate();

  if (isToday) {
    return new Intl.DateTimeFormat("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).format(date);
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function countWords(markdown) {
  const chineseChars = (markdown.match(/[\u4e00-\u9fa5]/g) || []).length;
  const latinWords = (markdown.replace(/[\u4e00-\u9fa5]/g, " ").match(/[A-Za-z0-9_]+/g) || []).length;
  return chineseChars + latinWords;
}

function slugify(text, index) {
  const slug = text
    .trim()
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/[\s\/\\]+/g, "-")
    .replace(/[^\w\-\u4e00-\u9fa5]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || `heading-${index}`;
}

function addHeadingIdsAndBuildToc() {
  const headings = Array.from(elements.document.querySelectorAll("h1, h2, h3, h4, h5, h6"));
  elements.toc.innerHTML = "";

  if (!headings.length) {
    elements.toc.innerHTML = `<span class="toc-empty">这个文档没有标题层级</span>`;
    return;
  }

  const fragment = document.createDocumentFragment();
  headings.forEach((heading, index) => {
    const level = Number(heading.tagName.slice(1));
    const text = heading.textContent.trim() || `标题 ${index + 1}`;
    heading.id = slugify(text, index);

    const link = document.createElement("a");
    link.href = `#${heading.id}`;
    link.textContent = text;
    link.className = `level-${level}`;
    link.addEventListener("click", (event) => {
      event.preventDefault();
      heading.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    fragment.appendChild(link);
  });

  elements.toc.appendChild(fragment);
}

function patchLinksAndImages() {
  elements.document.querySelectorAll("a[href]").forEach((link) => {
    const href = link.getAttribute("href") || "";
    if (/^https?:\/\//i.test(href)) {
      link.setAttribute("target", "_blank");
      link.setAttribute("rel", "noreferrer noopener");
    }
  });

  elements.document.querySelectorAll("img").forEach((img) => {
    img.loading = "lazy";
    img.decoding = "async";
    img.addEventListener("error", () => {
      img.classList.add("is-broken");
      img.alt = img.alt || "图片加载失败";
      img.title = "图片加载失败：可能是远程资源禁止本地外链访问";
    }, { once: true });
  });
}

function renderMarkdown(file, options = {}) {
  state.file = file;
  state.rawMarkdown = file.content || "";

  const rawHtml = marked.parse(state.rawMarkdown);
  const cleanHtml = DOMPurify.sanitize(rawHtml, {
    ADD_ATTR: ["target", "style"],
    USE_PROFILES: { html: true }
  });

  state.renderedHtml = cleanHtml;
  elements.document.innerHTML = cleanHtml || "<p>这个文件没有内容。</p>";
  patchLinksAndImages();
  addHeadingIdsAndBuildToc();

  elements.reader.classList.remove("is-hidden");
  elements.topbarDocInfo.classList.remove("is-hidden");
  elements.toolbar.classList.remove("is-hidden");
  elements.floatingStats.classList.remove("is-hidden");

  elements.docTitle.textContent = file.name;
  elements.docPath.textContent = file.path;
  elements.wordCount.textContent = `${countWords(state.rawMarkdown).toLocaleString("zh-CN")} 字 · ${formatBytes(file.size)}`;
  elements.modifiedAt.textContent = `${formatDate(file.modifiedAt)} 修改`;
  elements.refreshButton.disabled = Boolean(options.isDefault);
  elements.revealButton.disabled = Boolean(options.isDefault);

  const stage = document.querySelector(".document-stage");
  stage?.scrollTo({ top: 0, left: 0, behavior: "auto" });

  if (!options.isDefault) {
    showToast(`已打开：${file.name}`);
    startAutoRefresh();
  }
}

async function openFileDialog() {
  try {
    const file = await window.mdLens.openFileDialog();
    if (file) renderMarkdown(file);
  } catch (error) {
    showToast(error.message || "打开文件失败");
  }
}

async function refreshFile({ quiet = false } = {}) {
  if (!state.file?.path) return;

  try {
    const file = await window.mdLens.readFile(state.file.path);
    const changed = file.content !== state.rawMarkdown || file.modifiedAt !== state.file.modifiedAt;
    if (changed) {
      renderMarkdown(file);
      if (!quiet) showToast("已刷新文档");
    } else if (!quiet) {
      showToast("文档没有变化");
    }
  } catch (error) {
    showToast(error.message || "刷新失败");
  }
}

function startAutoRefresh() {
  window.clearInterval(state.watcherTimer);
  state.watcherTimer = window.setInterval(() => refreshFile({ quiet: true }), 1800);
}

function showSearch() {
  elements.searchBar.classList.add("is-visible");
  elements.searchInput.focus();
  elements.searchInput.select();
}

function clearSearchMarks() {
  elements.document.querySelectorAll("mark.search-hit").forEach((mark) => {
    const parent = mark.parentNode;
    parent.replaceChild(document.createTextNode(mark.textContent), mark);
    parent.normalize();
  });
}

function highlightSearch(query) {
  clearSearchMarks();
  if (!query.trim()) return;

  const walker = document.createTreeWalker(elements.document, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      if (["SCRIPT", "STYLE", "CODE", "PRE"].includes(node.parentElement?.tagName)) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);

  const lowerQuery = query.toLowerCase();
  let firstHit = null;

  nodes.forEach((node) => {
    const text = node.nodeValue;
    const lowerText = text.toLowerCase();
    const index = lowerText.indexOf(lowerQuery);
    if (index === -1) return;

    const range = document.createRange();
    range.setStart(node, index);
    range.setEnd(node, index + query.length);

    const mark = document.createElement("mark");
    mark.className = "search-hit";
    range.surroundContents(mark);
    firstHit ||= mark;
  });

  if (firstHit) firstHit.scrollIntoView({ behavior: "smooth", block: "center" });
}

function bindDragDrop() {
  let dragDepth = 0;

  const showDropOverlay = () => elements.dropOverlay.classList.add("is-visible");
  const hideDropOverlay = () => {
    dragDepth = 0;
    elements.dropOverlay.classList.remove("is-visible");
  };

  window.addEventListener("onepage-drag-enter", showDropOverlay);
  window.addEventListener("onepage-drag-leave", hideDropOverlay);

  window.addEventListener("dragenter", (event) => {
    event.preventDefault();
    dragDepth += 1;
    showDropOverlay();
  });

  window.addEventListener("dragover", (event) => {
    event.preventDefault();
  });

  window.addEventListener("dragleave", (event) => {
    event.preventDefault();
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) elements.dropOverlay.classList.remove("is-visible");
  });

  window.addEventListener("drop", async (event) => {
    event.preventDefault();
    hideDropOverlay();

    const droppedFile = event.dataTransfer.files?.[0];
    const filePath = droppedFile ? window.mdLens.getPathForFile(droppedFile) : "";
    if (!filePath) return;

    try {
      const file = await window.mdLens.readFile(filePath);
      renderMarkdown(file);
    } catch (error) {
      showToast(error.message || "无法读取拖入的文件");
    }
  });
}

function bindShortcuts() {
  window.addEventListener("keydown", (event) => {
    const mod = event.metaKey || event.ctrlKey;
    if (mod && event.key.toLowerCase() === "o") {
      event.preventDefault();
      openFileDialog();
    }
    if (mod && event.key.toLowerCase() === "r") {
      event.preventDefault();
      refreshFile();
    }
    if (mod && event.key.toLowerCase() === "f") {
      event.preventDefault();
      showSearch();
    }
    if (event.key === "Escape") {
      elements.searchBar.classList.remove("is-visible");
      elements.searchInput.value = "";
      clearSearchMarks();
    }
  });
}

elements.openButton.addEventListener("click", openFileDialog);
elements.refreshButton.addEventListener("click", () => refreshFile());
elements.revealButton.addEventListener("click", () => {
  if (state.file?.path) window.mdLens.revealFile(state.file.path);
});
elements.closeSearchButton.addEventListener("click", () => {
  elements.searchBar.classList.remove("is-visible");
  elements.searchInput.value = "";
  clearSearchMarks();
});
elements.searchInput.addEventListener("input", () => highlightSearch(elements.searchInput.value));

window.mdLens.onFileOpened((file) => renderMarkdown(file));
window.mdLens.onFileError((payload) => showToast(`${payload.path || "文件"}：${payload.message}`));

async function loadDefaultDocument() {
  const response = await fetch("./default.md");
  const content = await response.text();
  renderMarkdown({
    path: "内置演示文档",
    name: "欢迎来到一页.md",
    dir: "",
    size: new Blob([content]).size,
    modifiedAt: new Date().toISOString(),
    content
  }, { isDefault: true });
}

bindDragDrop();
bindShortcuts();
loadDefaultDocument().catch(() => showToast("默认文档加载失败"));
