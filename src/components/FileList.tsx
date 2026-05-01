/**
 * 文件列表组件
 *
 * 展示已添加的 PDF 文件列表，支持：
 * - 显示文件名、页数、文件大小
 * - 点击选中/多选（Ctrl+点击）
 * - 拖拽文件到列表区域直接添加
 * - 选中高亮效果
 */

import { useState } from "react";
import type { PdfFileInfo } from "../types";

interface FileListProps {
  /** 文件列表 */
  files: PdfFileInfo[];
  /** 已选中的索引集合 */
  selectedIndices: Set<number>;
  /** 切换选中回调 */
  onToggleSelect: (index: number, multi: boolean) => void;
  /** 文件总数 */
  totalPages: number;
  /** 拖拽添加文件回调 */
  onDropFiles?: (paths: string[]) => void;
}

export default function FileList({
  files,
  selectedIndices,
  onToggleSelect,
  totalPages,
  onDropFiles,
}: FileListProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  /** 处理拖拽进入 */
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  /** 处理拖拽离开 */
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  /** 处理文件拖放 - 提取 PDF 文件路径并回调 */
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const droppedFiles = e.dataTransfer.files;
    if (!droppedFiles || droppedFiles.length === 0) return;

    const pdfPaths: string[] = [];
    for (let i = 0; i < droppedFiles.length; i++) {
      const file = droppedFiles[i];
      if (file.name.toLowerCase().endsWith(".pdf")) {
        // Tauri 环境中 File 对象的 path 属性包含完整路径
        pdfPaths.push((file as any).path || file.name);
      }
    }

    if (pdfPaths.length > 0 && onDropFiles) {
      onDropFiles(pdfPaths);
    }
  };

  return (
    <div className="card file-list-card">
      <div className="card-header">
        <span className="card-title">文件列表</span>
        <div className="card-header-right">
          <span className="file-stats">
            {files.length} 个文件 | {totalPages} 页
          </span>
        </div>
      </div>

      <div
        className={`file-list-container ${isDragOver ? "drag-over" : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {files.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">&#128196;</div>
            <p>暂无文件</p>
            <p className="empty-hint">点击上方按钮添加 PDF 文件或文件夹</p>
            <p className="empty-hint">也可以直接拖拽文件到此区域</p>
          </div>
        ) : (
          <div className="file-list">
            {/* 表头 */}
            <div className="file-list-header">
              <span className="col-index">#</span>
              <span className="col-name">文件名</span>
              <span className="col-pages">页数</span>
              <span className="col-size">大小</span>
            </div>
            {/* 文件行 */}
            {files.map((file, index) => (
              <div
                key={`${file.path}-${index}`}
                className={`file-item ${selectedIndices.has(index) ? "selected" : ""}`}
                onClick={(e) => onToggleSelect(index, e.ctrlKey || e.metaKey)}
              >
                <span className="col-index">{index + 1}</span>
                <span className="col-name" title={file.path}>
                  {file.name}
                </span>
                <span className="col-pages">{file.page_count}</span>
                <span className="col-size">{file.size_display}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

