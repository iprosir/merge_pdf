/**
 * 状态栏组件
 *
 * 显示在窗口底部，展示当前操作状态和提示信息。
 * 根据不同状态类型显示不同的颜色指示。
 */

import type { AppStatus } from "../types";

interface StatusBarProps {
  /** 状态消息文本 */
  message: string;
  /** 应用状态类型 */
  status: AppStatus;
}

export default function StatusBar({ message, status }: StatusBarProps) {
  return (
    <div className={`status-bar status-${status}`}>
      <span className="status-indicator" />
      <span className="status-text">{message}</span>
    </div>
  );
}

