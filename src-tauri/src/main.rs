use chrono::{DateTime, Utc};
use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::Mutex;
use tauri::{Emitter, Manager, RunEvent};

#[derive(Default)]
struct OpenedFiles(Mutex<Vec<String>>);

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct FilePayload {
    path: String,
    name: String,
    dir: String,
    size: u64,
    modified_at: String,
    content: String,
}

fn is_markdown_file(path: &Path) -> bool {
    path.extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| matches!(ext.to_ascii_lowercase().as_str(), "md" | "markdown" | "mdown" | "mkd" | "txt"))
        .unwrap_or(false)
}

fn read_markdown_path(path: PathBuf) -> Result<FilePayload, String> {
    if !is_markdown_file(&path) {
        return Err("请选择 Markdown 或文本文件".to_string());
    }

    let canonical_path = path.canonicalize().map_err(|error| error.to_string())?;
    let metadata = fs::metadata(&canonical_path).map_err(|error| error.to_string())?;

    if !metadata.is_file() {
        return Err("不是可读取的文件".to_string());
    }

    let content = fs::read_to_string(&canonical_path).map_err(|error| error.to_string())?;
    let modified: DateTime<Utc> = metadata
        .modified()
        .map_err(|error| error.to_string())?
        .into();

    Ok(FilePayload {
        path: canonical_path.to_string_lossy().to_string(),
        name: canonical_path
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("未命名文档")
            .to_string(),
        dir: canonical_path
            .parent()
            .unwrap_or_else(|| Path::new(""))
            .to_string_lossy()
            .to_string(),
        size: metadata.len(),
        modified_at: modified.to_rfc3339(),
        content,
    })
}

fn file_url_to_path(url: &tauri::Url) -> Option<String> {
    if url.scheme() == "file" {
        return url
            .to_file_path()
            .ok()
            .map(|path| path.to_string_lossy().to_string());
    }

    Some(url.path().to_string())
}

#[tauri::command]
fn read_markdown_file(path: String) -> Result<FilePayload, String> {
    read_markdown_path(PathBuf::from(path))
}

#[tauri::command]
fn opened_files(app: tauri::AppHandle) -> Vec<String> {
    app.state::<OpenedFiles>()
        .0
        .lock()
        .map(|paths| paths.clone())
        .unwrap_or_default()
}

#[tauri::command]
fn open_file_dialog() -> Result<Option<FilePayload>, String> {
    let picked = rfd::FileDialog::new()
        .add_filter("Markdown", &["md", "markdown", "mdown", "mkd", "txt"])
        .pick_file();

    match picked {
        Some(path) => read_markdown_path(path).map(Some),
        None => Ok(None),
    }
}

#[tauri::command]
fn reveal_file(path: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg("-R")
            .arg(path)
            .status()
            .map_err(|error| error.to_string())?;
        return Ok(());
    }

    #[cfg(not(target_os = "macos"))]
    {
        let parent = PathBuf::from(path)
            .parent()
            .map(|path| path.to_path_buf())
            .ok_or_else(|| "无法定位文件夹".to_string())?;
        open::that(parent).map_err(|error| error.to_string())?;
        Ok(())
    }
}

fn main() {
    tauri::Builder::default()
        .manage(OpenedFiles::default())
        .invoke_handler(tauri::generate_handler![
            open_file_dialog,
            opened_files,
            read_markdown_file,
            reveal_file
        ])
        .build(tauri::generate_context!())
        .expect("failed to build OnePage")
        .run(|app, event| {
            if let RunEvent::Opened { urls } = event {
                let paths = urls
                    .iter()
                    .filter_map(file_url_to_path)
                    .filter(|path| is_markdown_file(Path::new(path)))
                    .collect::<Vec<_>>();

                if paths.is_empty() {
                    return;
                }

                if let Ok(mut opened_paths) = app.state::<OpenedFiles>().0.lock() {
                    *opened_paths = paths.clone();
                }

                let _ = app.emit("opened-file", paths.clone());

                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        });
}
