/**
 * 输出设置组件
 *
 * 包含输出文件名输入框和浏览按钮，
 * 以及合并、打开目录、退出按钮。
 */

import type { AppStatus } from "../types";

interface OutputSettingsProps {
  /** 输出文件路径 */
  outputPath: string;
  /** 文件数量 */
  fileCount: number;
  /** 应用状态 */
  status: AppStatus;
  /** 设置输出路径回调 */
  onSetOutputPath: (path: string) => void;
  /** 浏览输出路径回调 */
  onBrowseOutputPath: () => void;
  /** 合并回调 */
  onMerge: () => void;
  /** 打开输出目录回调 */
  onOpenOutputDir: () => void;
}

export default function OutputSettings({
  outputPath,
  fileCount,
  status,
  onSetOutputPath,
  onBrowseOutputPath,
  onMerge,
  onOpenOutputDir,
}: OutputSettingsProps) {
  const isBusy = status === "merging" || status === "loading";

  return (
    <div className="output-section">
      {/* 输出路径设置 */}
      <div className="card output-card">
        <div className="card-header">
          <span className="card-title">输出设置</span>
        </div>
        <div className="output-row">
          <label className="output-label">保存到:</label>
          <input
            type="text"
            className="output-input"
            value={outputPath}
            onChange={(e) => onSetOutputPath(e.target.value)}
            placeholder="选择输出路径..."
            disabled={isBusy}
          />
          <button className="btn btn-outline" onClick={onBrowseOutputPath} disabled={isBusy}>
            浏览...
          </button>
        </div>
      </div>

      {/* 操作按钮行 */}
      <div className="merge-actions">
        <button
          className="btn btn-success btn-large"
          onClick={onMerge}
          disabled={isBusy || fileCount === 0}
        >
          {status === "merging" ? "合并中..." : "合并 PDF"}
        </button>
        <button className="btn btn-secondary" onClick={onOpenOutputDir} disabled={!outputPath}>
          打开输出目录
        </button>
      </div>
    </div>
  );
}

