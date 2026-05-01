/**
 * 操作按钮栏组件
 *
 * 包含文件添加、排序、移动、删除等操作按钮。
 * 根据当前状态自动禁用不可用的按钮。
 */

import type { AppStatus } from "../types";

interface ActionBarProps {
  /** 文件数量 */
  fileCount: number;
  /** 选中文件数量 */
  selectedCount: number;
  /** 应用状态 */
  status: AppStatus;
  /** 添加文件回调 */
  onAddFiles: () => void;
  /** 添加文件夹回调 */
  onAddFolder: () => void;
  /** 上移回调 */
  onMoveUp: () => void;
  /** 下移回调 */
  onMoveDown: () => void;
  /** 全选回调 */
  onSelectAll: () => void;
  /** 移除选中回调 */
  onRemoveSelected: () => void;
  /** 按名称排序回调 */
  onSortByName: () => void;
  /** 清空列表回调 */
  onClearAll: () => void;
}

export default function ActionBar({
  fileCount,
  selectedCount,
  status,
  onAddFiles,
  onAddFolder,
  onMoveUp,
  onMoveDown,
  onSelectAll,
  onRemoveSelected,
  onSortByName,
  onClearAll,
}: ActionBarProps) {
  const isBusy = status === "merging" || status === "loading";
  const hasFiles = fileCount > 0;
  const hasSelection = selectedCount > 0;
  const singleSelection = selectedCount === 1;

  return (
    <div className="action-bar">
      {/* 添加操作区 */}
      <div className="card action-card">
        <div className="card-header">
          <span className="card-title">添加来源</span>
        </div>
        <div className="action-buttons">
          <button className="btn btn-primary" onClick={onAddFiles} disabled={isBusy}>
            + 添加文件
          </button>
          <button className="btn btn-primary" onClick={onAddFolder} disabled={isBusy}>
            + 添加文件夹
          </button>
          <div className="spacer" />
          <button className="btn btn-danger" onClick={onClearAll} disabled={isBusy || !hasFiles}>
            清空列表
          </button>
        </div>
      </div>

      {/* 列表操作区 */}
      <div className="card action-card">
        <div className="card-header">
          <span className="card-title">列表操作</span>
        </div>
        <div className="action-buttons">
          <button className="btn btn-secondary" onClick={onMoveUp}
            disabled={isBusy || !singleSelection}>
            上移
          </button>
          <button className="btn btn-secondary" onClick={onMoveDown}
            disabled={isBusy || !singleSelection}>
            下移
          </button>
          <button className="btn btn-secondary" onClick={onSelectAll}
            disabled={isBusy || !hasFiles}>
            全选
          </button>
          <button className="btn btn-warning" onClick={onRemoveSelected}
            disabled={isBusy || !hasSelection}>
            移除选中 {hasSelection && `(${selectedCount})`}
          </button>
          <div className="spacer" />
          <button className="btn btn-secondary" onClick={onSortByName}
            disabled={isBusy || !hasFiles}>
            按名称排序
          </button>
        </div>
      </div>
    </div>
  );
}

