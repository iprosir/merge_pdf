//! PDF 合并核心逻辑模块
//!
//! 使用 lopdf 库实现 PDF 文件的合并操作。
//! 支持多文件合并、页数统计、进度回报等功能。
//!
//! 合并策略：将源文档的全部对象（含字体、图片、内容流等）
//! 完整复制到目标文档中，并通过 ID 偏移 + 引用重映射保证
//! 合并后的 PDF 结构完整可用。

use lopdf::{Document, Object, ObjectId};
use serde::Serialize;
use std::collections::BTreeMap;
use std::path::Path;
use tauri::Emitter;

/// 合并进度事件数据（通过 Tauri 事件系统发送到前端）
#[derive(Debug, Serialize, Clone)]
pub struct MergeProgressEvent {
    pub current: usize,
    pub total: usize,
    pub current_file: String,
    pub percent: u32,
}

/// 获取 PDF 文件的页数
pub fn get_page_count(file_path: &str) -> Result<u32, String> {
    let doc = Document::load(file_path)
        .map_err(|e| format!("无法打开 PDF 文件: {}", e))?;
    Ok(doc.get_pages().len() as u32)
}

/// 合并多个 PDF 文件为一个
///
/// 将指定的多个 PDF 文件按顺序合并，合并过程中通过
/// Tauri 事件系统向前端发送实时进度。
pub fn merge_pdf_files(
    file_paths: &[String],
    output_path: &str,
    app_handle: &tauri::AppHandle,
) -> Result<(), String> {
    let total = file_paths.len();
    if total == 0 {
        return Err("没有要合并的文件".to_string());
    }

    // 发送第一个文件进度
    let first_name = extract_filename(&file_paths[0]);
    emit_progress(app_handle, 1, total, &first_name,
        if total == 1 { 50 } else { (100 / total) as u32 });

    // 加载第一个 PDF 作为基础文档
    let mut merged_doc = Document::load(&file_paths[0])
        .map_err(|e| format!("无法打开 '{}': {}", first_name, e))?;

    // 逐个合并后续文件
    for (index, file_path) in file_paths.iter().enumerate().skip(1) {
        let file_name = extract_filename(file_path);
        let percent = ((index + 1) as f64 / total as f64 * 100.0) as u32;
        emit_progress(app_handle, index + 1, total, &file_name,
            std::cmp::min(percent, 95));

        let source_doc = Document::load(file_path)
            .map_err(|e| format!("无法打开 '{}': {}", file_name, e))?;

        merge_document(&mut merged_doc, &source_doc)
            .map_err(|e| format!("合并 '{}' 时出错: {}", file_name, e))?;
    }

    // 保存合并结果
    emit_progress(app_handle, total, total, "正在保存...", 98);

    merged_doc.save(output_path)
        .map_err(|e| format!("保存合并后的 PDF 失败: {}", e))?;

    emit_progress(app_handle, total, total, "完成", 100);
    Ok(())
}

/// 从路径中提取文件名
fn extract_filename(path: &str) -> String {
    Path::new(path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("未知")
        .to_string()
}

/// 发送合并进度事件到前端
fn emit_progress(
    app_handle: &tauri::AppHandle,
    current: usize, total: usize,
    file: &str, percent: u32,
) {
    let _ = app_handle.emit("merge-progress", MergeProgressEvent {
        current, total, current_file: file.to_string(), percent,
    });
}

/// 将源文档的所有页面完整合并到目标文档
///
/// 实现原理：
/// 1. 将源文档全部对象（页面、字体、图片、流等）复制到目标文档
/// 2. 通过 ID 偏移避免对象 ID 冲突
/// 3. 递归更新所有内部引用指向新 ID
/// 4. 将源文档页面插入目标文档的 Pages 树
fn merge_document(target: &mut Document, source: &Document) -> Result<(), String> {
    // 构建 ID 映射表：源对象 ID -> 新对象 ID
    let mut id_map: BTreeMap<ObjectId, ObjectId> = BTreeMap::new();
    let mut max_id = target.max_id;

    // 第一步：复制源文档所有对象，分配新 ID
    for (&old_id, object) in &source.objects {
        max_id += 1;
        let new_id = (max_id, 0);
        id_map.insert(old_id, new_id);
        target.objects.insert(new_id, object.clone());
    }

    // 第二步：更新所有新复制对象中的内部引用
    let new_ids: Vec<ObjectId> = id_map.values().cloned().collect();
    for new_id in &new_ids {
        if let Some(obj) = target.objects.get_mut(new_id) {
            remap_references(obj, &id_map);
        }
    }

    // 第三步：获取目标文档 Pages 字典的 ObjectId
    let pages_id = target
        .catalog()
        .map_err(|e| format!("无法获取目录: {}", e))?
        .get(b"Pages")
        .map_err(|e| format!("无法获取 Pages: {}", e))?
        .as_reference()
        .map_err(|e| format!("Pages 不是引用: {}", e))?;

    // 第四步：将源文档页面按顺序添加到目标 Pages 树
    let source_pages = source.get_pages();
    let mut page_numbers: Vec<u32> = source_pages.keys().cloned().collect();
    page_numbers.sort();

    for &page_num in &page_numbers {
        if let Some(&old_page_id) = source_pages.get(&page_num) {
            if let Some(&new_page_id) = id_map.get(&old_page_id) {
                // 更新页面的 Parent 引用为目标文档的 Pages 节点
                if let Some(Object::Dictionary(ref mut dict)) =
                    target.objects.get_mut(&new_page_id)
                {
                    dict.set("Parent", Object::Reference(pages_id));
                }

                // 将页面引用追加到 Kids 数组，并递增 Count
                if let Ok(pages_obj) = target.get_object_mut(pages_id) {
                    if let Object::Dictionary(ref mut dict) = pages_obj {
                        if let Ok(kids) = dict.get_mut(b"Kids") {
                            if let Object::Array(ref mut arr) = kids {
                                arr.push(Object::Reference(new_page_id));
                            }
                        }
                        if let Ok(count) = dict.get_mut(b"Count") {
                            if let Object::Integer(ref mut n) = count {
                                *n += 1;
                            }
                        }
                    }
                }
            }
        }
    }

    // 更新目标文档的最大对象 ID
    target.max_id = max_id;
    Ok(())
}

/// 递归更新对象中的所有引用，将旧 ID 替换为新 ID
fn remap_references(object: &mut Object, id_map: &BTreeMap<ObjectId, ObjectId>) {
    match object {
        Object::Reference(ref mut id) => {
            if let Some(&new_id) = id_map.get(id) {
                *id = new_id;
            }
        }
        Object::Array(ref mut arr) => {
            for item in arr.iter_mut() {
                remap_references(item, id_map);
            }
        }
        Object::Dictionary(ref mut dict) => {
            for (_, value) in dict.iter_mut() {
                remap_references(value, id_map);
            }
        }
        Object::Stream(ref mut stream) => {
            for (_, value) in stream.dict.iter_mut() {
                remap_references(value, id_map);
            }
        }
        _ => {}
    }
}

