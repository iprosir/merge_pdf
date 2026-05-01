import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite 构建配置
// 参考: https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],

  // 阻止 Vite 遮挡 Rust 错误信息
  clearScreen: false,

  // Tauri 开发服务器配置
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      // 忽略 Rust 源码目录，避免不必要的重载
      ignored: ["**/src-tauri/**"],
    },
  },
}));

