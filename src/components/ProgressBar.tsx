/**
 * 进度条组件
 *
 * 在合并过程中显示当前进度和正在处理的文件名。
 * 支持动画过渡和状态颜色变化。
 */

import type { MergeProgress, AppStatus } from "../types";

interface ProgressBarProps {
  /** 合并进度数据 */
  progress: MergeProgress | null;
  /** 应用状态 */
  status: AppStatus;
}

export default function ProgressBar({ progress, status }: ProgressBarProps) {
  const percent = progress?.percent ?? 0;
  const isActive = status === "merging";
  const isComplete = status === "success" && percent === 100;

  return (
    <div className={`progress-section ${isActive ? "active" : ""}`}>
      <div className="progress-bar-container">
        <div
          className={`progress-bar-fill ${isComplete ? "complete" : ""}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      {progress && isActive && (
        <div className="progress-info">
          <span className="progress-file">{progress.current_file}</span>
          <span className="progress-count">
            {progress.current}/{progress.total} ({percent}%)
          </span>
        </div>
      )}
    </div>
  );
}

