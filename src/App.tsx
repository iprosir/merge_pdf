/**
 * PDF 合并工具 - 主应用组件
 *
 * 应用入口组件，负责组合所有子组件并传递状态和回调。
 * 通过 usePdfMerger Hook 管理所有业务逻辑，保持组件层的纯展示职责。
 */

import { usePdfMerger } from "./hooks/usePdfMerger";
import ActionBar from "./components/ActionBar";
import FileList from "./components/FileList";
import OutputSettings from "./components/OutputSettings";
import ProgressBar from "./components/ProgressBar";
import StatusBar from "./components/StatusBar";

export default function App() {
  const {
    files,
    selectedIndices,
    outputPath,
    status,
    statusMessage,
    progress,
    totalPages,
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
  } = usePdfMerger();

  return (
    <div className="app-container">
      {/* 标题栏 */}
      <header className="app-header">
        <div className="header-left">
          <h1 className="app-title">PDF Merge Tool</h1>
          <p className="app-subtitle">快递面单合并工具 - 支持多文件 / 多文件夹批量添加</p>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="app-main">
        {/* 操作按钮栏 */}
        <ActionBar
          fileCount={files.length}
          selectedCount={selectedIndices.size}
          status={status}
          onAddFiles={addFiles}
          onAddFolder={addFolder}
          onMoveUp={moveUp}
          onMoveDown={moveDown}
          onSelectAll={selectAll}
          onRemoveSelected={removeSelected}
          onSortByName={sortByName}
          onClearAll={clearAll}
        />

        {/* 文件列表 */}
        <FileList
          files={files}
          selectedIndices={selectedIndices}
          onToggleSelect={toggleSelect}
          totalPages={totalPages}
          onDropFiles={handleDropFiles}
        />

        {/* 输出设置和合并操作 */}
        <OutputSettings
          outputPath={outputPath}
          fileCount={files.length}
          status={status}
          onSetOutputPath={setOutputPath}
          onBrowseOutputPath={browseOutputPath}
          onMerge={mergePdfs}
          onOpenOutputDir={openOutputDir}
        />

        {/* 进度条 */}
        <ProgressBar progress={progress} status={status} />
      </main>

      {/* 状态栏 */}
      <StatusBar message={statusMessage} status={status} />
    </div>
  );
}

