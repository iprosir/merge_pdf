//! PDF 合并工具 - 核心库
//!
//! 本模块提供 Tauri 应用的核心功能，包括：
//! - PDF 文件信息获取
//! - PDF 文件合并
//! - 文件系统相关操作

mod pdf;

use pdf::merger;
use serde::{Deserialize, Serialize};
use std::path::Path;

/// PDF 文件信息结构体
/// 用于前端展示文件列表时的数据传输
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PdfFileInfo {
    /// 文件完整路径
    pub path: String,
    /// 文件名（不含路径）
    pub name: String,
    /// 文件大小（字节）
    pub size: u64,
    /// 文件大小的可读格式（如 "1.2 MB"）
    pub size_display: String,
    /// PDF 页数
    pub page_count: u32,
}

/// 合并进度信息
/// 用于向前端发送实时合并进度
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MergeProgress {
    /// 当前正在处理的文件索引（从1开始）
    pub current: u32,
    /// 文件总数
    pub total: u32,
    /// 当前正在处理的文件名
    pub current_file: String,
    /// 进度百分比（0-100）
    pub percent: u32,
}

/// 合并结果
#[derive(Debug, Serialize, Deserialize)]
pub struct MergeResult {
    /// 是否成功
    pub success: bool,
    /// 结果消息
    pub message: String,
    /// 输出文件路径
    pub output_path: String,
}

/// 将字节数转换为可读的文件大小格式
fn format_file_size(bytes: u64) -> String {
    const KB: f64 = 1024.0;
    const MB: f64 = KB * 1024.0;
    const GB: f64 = MB * 1024.0;

    if bytes as f64 >= GB {
        format!("{:.2} GB", bytes as f64 / GB)
    } else if bytes as f64 >= MB {
        format!("{:.2} MB", bytes as f64 / MB)
    } else if bytes as f64 >= KB {
        format!("{:.1} KB", bytes as f64 / KB)
    } else {
        format!("{} B", bytes)
    }
}

/// 获取单个 PDF 文件的详细信息
/// 
/// 读取文件大小和 PDF 页数，返回 PdfFileInfo 结构
#[tauri::command]
fn get_pdf_info(file_path: String) -> Result<PdfFileInfo, String> {
    let path = Path::new(&file_path);

    // 验证文件存在
    if !path.exists() {
        return Err(format!("文件不存在: {}", file_path));
    }

    // 获取文件名
    let name = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("未知文件")
        .to_string();

    // 获取文件大小
    let metadata = std::fs::metadata(path)
        .map_err(|e| format!("无法读取文件元数据: {}", e))?;
    let size = metadata.len();
    let size_display = format_file_size(size);

    // 获取 PDF 页数
    let page_count = merger::get_page_count(&file_path).unwrap_or(0);

    Ok(PdfFileInfo {
        path: file_path,
        name,
        size,
        size_display,
        page_count,
    })
}

/// 批量获取多个 PDF 文件的信息
///
/// 对于无法读取的文件会静默跳过（返回 None），
/// 前端通过 filter 过滤掉 null 项即可。
#[tauri::command]
fn get_pdf_infos(file_paths: Vec<String>) -> Vec<Option<PdfFileInfo>> {
    file_paths.into_iter().map(|p| get_pdf_info(p).ok()).collect()
}

/// 扫描文件夹中的所有 PDF 文件
/// 
/// 递归查找指定文件夹下所有 .pdf 文件并返回路径列表
#[tauri::command]
fn scan_folder(folder_path: String) -> Result<Vec<String>, String> {
    let path = Path::new(&folder_path);
    if !path.is_dir() {
        return Err(format!("无效的文件夹路径: {}", folder_path));
    }

    let mut pdf_files: Vec<String> = Vec::new();
    let entries = std::fs::read_dir(path)
        .map_err(|e| format!("无法读取文件夹: {}", e))?;

    for entry in entries.flatten() {
        let entry_path = entry.path();
        if entry_path.is_file() {
            if let Some(ext) = entry_path.extension() {
                if ext.to_str().unwrap_or("").to_uppercase() == "PDF" {
                    if let Some(path_str) = entry_path.to_str() {
                        pdf_files.push(path_str.to_string());
                    }
                }
            }
        }
    }

    // 按文件名排序
    pdf_files.sort_by(|a, b| {
        let name_a = Path::new(a).file_name().unwrap_or_default();
        let name_b = Path::new(b).file_name().unwrap_or_default();
        name_a.cmp(&name_b)
    });

    Ok(pdf_files)
}

/// 合并多个 PDF 文件为一个
///
/// 将指定的多个 PDF 文件按顺序合并，输出到指定路径
#[tauri::command]
fn merge_pdfs(
    file_paths: Vec<String>,
    output_path: String,
    app_handle: tauri::AppHandle,
) -> Result<MergeResult, String> {
    if file_paths.is_empty() {
        return Err("文件列表为空，请先添加 PDF 文件".to_string());
    }

    if output_path.is_empty() {
        return Err("请指定输出文件路径".to_string());
    }

    // 确保输出目录存在
    if let Some(parent) = Path::new(&output_path).parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("无法创建输出目录: {}", e))?;
    }

    // 执行合并
    merger::merge_pdf_files(&file_paths, &output_path, &app_handle)?;

    Ok(MergeResult {
        success: true,
        message: format!("成功合并 {} 个 PDF 文件", file_paths.len()),
        output_path,
    })
}

/// 生成默认输出文件名
///
/// 格式: 时间戳-文件数量单.pdf，例如: 202603311216-15单.pdf
#[tauri::command]
fn generate_output_filename(count: u32) -> String {
    let now = chrono::Local::now();
    let timestamp = now.format("%Y%m%d%H%M").to_string();
    format!("{}-{}单.pdf", timestamp, count)
}

/// 初始化并运行 Tauri 应用
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_pdf_info,
            get_pdf_infos,
            scan_folder,
            merge_pdfs,
            generate_output_filename,
        ])
        .run(tauri::generate_context!())
        .expect("运行 Tauri 应用时发生错误");
}

