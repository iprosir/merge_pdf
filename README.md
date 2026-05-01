# PDF 合并工具 (PDF Merge Tool)

一款基于 **Tauri v2 + React + Rust** 的跨平台 PDF 合并桌面应用。

支持 Windows、macOS（Intel & Apple Silicon）和 Linux。

---

## 功能特性

- **多文件添加**：通过文件选择器或文件夹批量添加 PDF 文件
- **文件去重**：自动检测并跳过已添加的重复文件
- **灵活排序**：支持上移、下移、按文件名排序
- **文件预览**：显示文件名、页数、文件大小等详细信息
- **批量操作**：全选、移除选中、清空列表
- **自定义输出**：支持自定义输出文件名和保存路径
- **合并进度**：实时显示合并进度条和当前处理文件
- **现代 UI**：深色主题，简洁优雅的界面设计

---

## 技术架构

```
前端 (React + TypeScript)
├── 组件层：FileList / ActionBar / OutputSettings / ProgressBar / StatusBar
├── 状态管理：usePdfMerger 自定义 Hook
└── 通信层：@tauri-apps/api (invoke + event)

后端 (Rust)
├── Tauri v2 框架：窗口管理、IPC 通信、插件系统
├── PDF 处理：lopdf 库
└── 模块划分：lib.rs (命令注册) + pdf/merger.rs (合并逻辑)
```

---

## 环境要求

### 开发环境

| 工具 | 版本要求 |
|------|----------|
| Node.js | >= 18.0 |
| Rust | >= 1.77 (stable) |
| npm | >= 9.0 |

### 平台特定依赖

**Windows:**
- WebView2（Windows 10 1803+ 已内置，或手动安装）
- Visual Studio Build Tools 2022（含 C++ 工作负载）

**macOS:**
- Xcode Command Line Tools：`xcode-select --install`
- 最低支持 macOS 10.15 (Catalina)

**Linux (Debian/Ubuntu):**
```bash
sudo apt-get install -y \
  libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev \
  patchelf libgtk-3-dev libsoup-3.0-dev
```

---

## 本地开发

### 1. 克隆项目

```bash
git clone https://github.com/your-username/pdf-merger.git
cd pdf-merger
```

### 2. 安装依赖

```bash
# 安装前端依赖
npm install
```

### 3. 启动开发模式

```bash
# 启动 Tauri 开发模式（自动启动前端 dev server + Rust 编译）
npm run tauri dev
```

### 4. 构建生产版本

```bash
# 构建当前平台的安装包
npm run tauri build
```

构建产物位于 `src-tauri/target/release/bundle/` 目录下。

---

## 项目结构

```
pdf-merger/
├── .github/workflows/       # CI/CD 工作流
│   └── release.yml          # 跨平台构建与发布
├── src/                     # 前端源码 (React + TypeScript)
│   ├── components/          # UI 组件
│   │   ├── ActionBar.tsx    # 操作按钮栏
│   │   ├── FileList.tsx     # 文件列表
│   │   ├── OutputSettings.tsx # 输出设置
│   │   ├── ProgressBar.tsx  # 进度条
│   │   └── StatusBar.tsx    # 状态栏
│   ├── hooks/
│   │   └── usePdfMerger.ts  # 核心业务逻辑 Hook
│   ├── styles/
│   │   └── global.css       # 全局样式（深色主题）
│   ├── types/
│   │   └── index.ts         # TypeScript 类型定义
│   ├── App.tsx              # 主应用组件
│   └── main.tsx             # 应用入口
├── src-tauri/               # Rust 后端
│   ├── src/
│   │   ├── main.rs          # 应用入口
│   │   ├── lib.rs           # 核心库（命令注册）
│   │   └── pdf/
│   │       ├── mod.rs       # 模块声明
│   │       └── merger.rs    # PDF 合并核心逻辑
│   ├── capabilities/
│   │   └── default.json     # 权限配置
│   ├── Cargo.toml           # Rust 依赖配置
│   └── tauri.conf.json      # Tauri 应用配置
├── .env.example             # 环境变量模板
├── .gitignore
├── index.html               # HTML 入口
├── LICENSE
├── package.json
├── README.md
├── tsconfig.json
└── vite.config.ts           # Vite 构建配置
```

---

## 使用教程

### 安装步骤

1. 从 [Releases](../../releases) 页面下载对应平台的安装包
2. **Windows**: 双击 `.msi` 或 `.exe` 安装包，按提示完成安装
3. **macOS**: 打开 `.dmg` 文件，将应用拖入 Applications 文件夹
4. **Linux**:
   - Debian/Ubuntu: `sudo dpkg -i pdf-merger_*.deb`
   - Fedora/CentOS: `sudo rpm -i pdf-merger_*.rpm`
   - 通用: 赋予 `.AppImage` 执行权限后双击运行

### 基本操作

1. **添加文件**: 点击「+ 添加文件」选择 PDF 文件，或点击「+ 添加文件夹」批量添加
2. **调整顺序**: 选中文件后使用「上移」「下移」按钮调整顺序，或点击「按名称排序」
3. **移除文件**: 选中文件后点击「移除选中」，或点击「清空列表」清除所有
4. **设置输出**: 在输出设置区域设置输出文件名，点击「浏览...」选择保存位置
5. **执行合并**: 点击「合并 PDF」开始合并，进度条会显示实时进度

---

## CI/CD 说明

### 自动构建发布

项目使用 GitHub Actions 实现自动化构建和发布：

1. 创建版本标签触发构建：
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. CI 会自动在以下平台构建安装包：
   - Windows x64: `.msi` + `.exe` (NSIS)
   - macOS x64: `.dmg` (Intel)
   - macOS arm64: `.dmg` (Apple Silicon)
   - Linux x64: `.deb` + `.rpm` + `.AppImage`

3. 所有构建产物自动上传到 GitHub Releases

### 代码签名配置（可选）

如需代码签名，在 GitHub 仓库的 Settings > Secrets 中配置：

- **Windows**: `TAURI_SIGNING_PRIVATE_KEY` / `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
- **macOS**: 配置 Apple Developer 证书相关环境变量
- 详见 [Tauri 官方签名文档](https://v2.tauri.app/distribute/sign/)

---

## 开源协议

本项目基于 [MIT License](LICENSE) 开源。

