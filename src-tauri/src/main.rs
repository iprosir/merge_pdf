//! PDF 合并工具 - Tauri 应用入口
//! 
//! 这是 Tauri 应用的主入口文件，负责初始化应用并注册所有插件和命令。

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    pdf_merger_lib::run()
}

