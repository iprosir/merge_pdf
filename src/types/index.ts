/**
 * PDF 文件信息接口
 * 对应 Rust 后端的 PdfFileInfo 结构体
 */
export interface PdfFileInfo {
  /** 文件完整路径 */
  path: string;
  /** 文件名（不含路径） */
  name: string;
  /** 文件大小（字节） */
  size: number;
  /** 文件大小的可读格式 */
  size_display: string;
  /** PDF 页数 */
  page_count: number;
}

/**
 * 合并进度事件数据
 * 对应 Rust 后端通过事件系统发送的进度信息
 */
export interface MergeProgress {
  /** 当前处理的文件索引（从1开始） */
  current: number;
  /** 文件总数 */
  total: number;
  /** 当前处理的文件名 */
  current_file: string;
  /** 进度百分比 (0-100) */
  percent: number;
}

/**
 * 合并结果
 */
export interface MergeResult {
  /** 是否成功 */
  success: boolean;
  /** 结果消息 */
  message: string;
  /** 输出文件路径 */
  output_path: string;
}

/**
 * 应用状态类型
 */
export type AppStatus = "idle" | "loading" | "merging" | "success" | "error";

