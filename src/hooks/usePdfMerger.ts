/**
 * PDF 合并工具核心状态管理 Hook
 *
 * 封装了文件管理、合并操作、进度追踪等所有核心业务逻辑，
 * 使 UI 组件保持纯展示职责。
 */

import { useState, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open, save } from "@tauri-apps/plugin-dialog";
import type { PdfFileInfo, MergeProgress, MergeResult, AppStatus } from "../types";

export function usePdfMerger() {
  // 文件列表
  const [files, setFiles] = useState<PdfFileInfo[]>([]);
  // 选中的文件索引集合
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  // 输出文件路径
  const [outputPath, setOutputPath] = useState<string>("");
  // 应用状态
  const [status, setStatus] = useState<AppStatus>("idle");
  // 状态栏消息
  const [statusMessage, setStatusMessage] = useState<string>("就绪 | 添加文件或文件夹开始使用");
  // 合并进度
  const [progress, setProgress] = useState<MergeProgress | null>(null);

  // 监听合并进度事件
  useEffect(() => {
    const unlisten = listen<MergeProgress>("merge-progress", (event) => {
      setProgress(event.payload);
    });
    return () => { unlisten.then((fn) => fn()); };
  }, []);

  // 文件数量变化时自动更新输出文件名
  useEffect(() => {
    if (files.length > 0) {
      updateOutputFilename(files.length);
    }
  }, [files.length]);

  /** 更新输出文件名 */
  const updateOutputFilename = useCallback(async (count: number) => {
    try {
      const filename = await invoke<string>("generate_output_filename", { count });
      setOutputPath(filename);
    } catch (e) {
      console.error("生成文件名失败:", e);
    }
  }, []);

  /** 添加文件（通过文件选择器） */
  const addFiles = useCallback(async () => {
    try {
      const selected = await open({
        multiple: true,
        filters: [{ name: "PDF 文件", extensions: ["pdf", "PDF"] }],
      });

      if (!selected || selected.length === 0) return;

      setStatus("loading");
      setStatusMessage("正在读取文件信息...");

      // 过滤已存在的文件（去重）
      const existingPaths = new Set(files.map((f) => f.path));
      const newPaths = selected.filter((p) => !existingPaths.has(p));

      if (newPaths.length === 0) {
        setStatusMessage("所选文件均已在列表中");
        setStatus("idle");
        return;
      }

      // 批量获取文件信息
      const results = await invoke<(PdfFileInfo | null)[]>("get_pdf_infos", {
        filePaths: newPaths,
      });

      const validFiles = results.filter((r): r is PdfFileInfo => r !== null);
      const skipped = selected.length - newPaths.length;

      setFiles((prev) => [...prev, ...validFiles]);
      setStatusMessage(
        `已添加 ${validFiles.length} 个文件` +
          (skipped > 0 ? `（跳过 ${skipped} 个重复）` : "")
      );
      setStatus("idle");
    } catch (e) {
      setStatusMessage(`添加文件失败: ${e}`);
      setStatus("error");
    }
  }, [files]);

  /** 添加文件夹 */
  const addFolder = useCallback(async () => {
    try {
      const folder = await open({ directory: true, multiple: false });
      if (!folder) return;

      setStatus("loading");
      setStatusMessage("正在扫描文件夹...");

      // 扫描文件夹中的 PDF 文件
      const paths = await invoke<string[]>("scan_folder", { folderPath: folder });

      if (paths.length === 0) {
        setStatusMessage("文件夹中未找到 PDF 文件");
        setStatus("idle");
        return;
      }

      // 去重
      const existingPaths = new Set(files.map((f) => f.path));
      const newPaths = paths.filter((p) => !existingPaths.has(p));

      if (newPaths.length === 0) {
        setStatusMessage("文件夹中的文件均已在列表中");
        setStatus("idle");
        return;
      }

      // 批量获取文件信息
      const results = await invoke<(PdfFileInfo | null)[]>("get_pdf_infos", {
        filePaths: newPaths,
      });

      const validFiles = results.filter((r): r is PdfFileInfo => r !== null);
      const skipped = paths.length - newPaths.length;

      setFiles((prev) => [...prev, ...validFiles]);
      setStatusMessage(
        `从文件夹添加 ${validFiles.length} 个文件` +
          (skipped > 0 ? `（跳过 ${skipped} 个重复）` : "")
      );
      setStatus("idle");
    } catch (e) {
      setStatusMessage(`扫描文件夹失败: ${e}`);
      setStatus("error");
    }
  }, [files]);

  /** 移除选中文件 */
  const removeSelected = useCallback(() => {
    if (selectedIndices.size === 0) return;
    const count = selectedIndices.size;
    setFiles((prev) => prev.filter((_, i) => !selectedIndices.has(i)));
    setSelectedIndices(new Set());
    setStatusMessage(`已移除 ${count} 个文件`);
  }, [selectedIndices]);

  /** 清空所有文件 */
  const clearAll = useCallback(() => {
    setFiles([]);
    setSelectedIndices(new Set());
    setProgress(null);
    setOutputPath("");
    setStatusMessage("列表已清空");
  }, []);

  /** 上移选中文件 */
  const moveUp = useCallback(() => {
    if (selectedIndices.size !== 1) return;
    const idx = Array.from(selectedIndices)[0];
    if (idx <= 0) return;
    setFiles((prev) => {
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
    setSelectedIndices(new Set([idx - 1]));
  }, [selectedIndices]);

  /** 下移选中文件 */
  const moveDown = useCallback(() => {
    if (selectedIndices.size !== 1) return;
    const idx = Array.from(selectedIndices)[0];
    if (idx >= files.length - 1) return;
    setFiles((prev) => {
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
    setSelectedIndices(new Set([idx + 1]));
  }, [selectedIndices, files.length]);

  /** 按文件名排序 */
  const sortByName = useCallback(() => {
    setFiles((prev) =>
      [...prev].sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))
    );
    setSelectedIndices(new Set());
    setStatusMessage("已按文件名排序");
  }, []);

  /** 全选 */
  const selectAll = useCallback(() => {
    setSelectedIndices(new Set(files.map((_, i) => i)));
  }, [files]);

  /** 切换选中状态 */
  const toggleSelect = useCallback((index: number, multi: boolean) => {
    setSelectedIndices((prev) => {
      const next = multi ? new Set(prev) : new Set<number>();
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  /** 选择输出路径 */
  const browseOutputPath = useCallback(async () => {
    try {
      const filename = outputPath || "merged.pdf";
      const selected = await save({
        defaultPath: filename,
        filters: [{ name: "PDF 文件", extensions: ["pdf"] }],
      });
      if (selected) {
        setOutputPath(selected);
      }
    } catch (e) {
      console.error("选择输出路径失败:", e);
    }
  }, [outputPath]);

  /** 执行合并操作 */
  const mergePdfs = useCallback(async () => {
    if (files.length === 0) {
      setStatusMessage("列表为空，请先添加 PDF 文件");
      return;
    }

    // 如果没有设置完整路径，先让用户选择保存路径
    let finalPath = outputPath;
    if (!finalPath || !finalPath.includes("/") && !finalPath.includes("\\")) {
      const selected = await save({
        defaultPath: outputPath || "merged.pdf",
        filters: [{ name: "PDF 文件", extensions: ["pdf"] }],
      });
      if (!selected) return;
      finalPath = selected;
      setOutputPath(finalPath);
    }

    try {
      setStatus("merging");
      setProgress({ current: 0, total: files.length, current_file: "准备中...", percent: 0 });

      const result = await invoke<MergeResult>("merge_pdfs", {
        filePaths: files.map((f) => f.path),
        outputPath: finalPath,
      });

      if (result.success) {
        setStatus("success");
        setStatusMessage(`合并完成 -> ${result.output_path}`);
      } else {
        setStatus("error");
        setStatusMessage(`合并失败: ${result.message}`);
      }
    } catch (e) {
      setStatus("error");
      setStatusMessage(`合并失败: ${e}`);
      setProgress(null);
    }
  }, [files, outputPath]);

  /** 打开输出目录 */
  const openOutputDir = useCallback(async () => {
    if (!outputPath) return;
    try {
      // 提取目录路径
      const dir = outputPath.replace(/[/\\][^/\\]*$/, "");
      if (dir) {
        const { openPath } = await import("@tauri-apps/plugin-opener");
        await openPath(dir);
      }
    } catch (e) {
      setStatusMessage(`打开目录失败: ${e}`);
    }
  }, [outputPath]);

  /** 处理拖拽添加的文件路径 */
  const handleDropFiles = useCallback(async (paths: string[]) => {
    try {
      setStatus("loading");
      setStatusMessage("正在读取拖入的文件...");

      // 去重
      const existingPaths = new Set(files.map((f) => f.path));
      const newPaths = paths.filter((p) => !existingPaths.has(p));

      if (newPaths.length === 0) {
        setStatusMessage("拖入的文件均已在列表中");
        setStatus("idle");
        return;
      }

      const results = await invoke<(PdfFileInfo | null)[]>("get_pdf_infos", {
        filePaths: newPaths,
      });

      const validFiles = results.filter((r): r is PdfFileInfo => r !== null);
      const skipped = paths.length - newPaths.length;

      setFiles((prev) => [...prev, ...validFiles]);
      setStatusMessage(
        `已拖入 ${validFiles.length} 个文件` +
          (skipped > 0 ? `（跳过 ${skipped} 个重复）` : "")
      );
      setStatus("idle");
    } catch (e) {
      setStatusMessage(`拖入文件失败: ${e}`);
      setStatus("error");
    }
  }, [files]);

  /** 计算总页数 */
  const totalPages = files.reduce((sum, f) => sum + f.page_count, 0);

  /** 计算总文件大小 */
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  return {
    // 状态
    files,
    selectedIndices,
    outputPath,
    status,
    statusMessage,
    progress,
    totalPages,
    totalSize,
    // 操作
    addFiles,
    addFolder,
    removeSelected,
    clearAll,
    moveUp,
    moveDown,
    sortByName,
    selectAll,
    toggleSelect,
    setOutputPath,
    browseOutputPath,
    mergePdfs,
    openOutputDir,
    handleDropFiles,
  };
}

