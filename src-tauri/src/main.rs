#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;

#[tauri::command]
fn close_window(window: tauri::WebviewWindow) {
    window.close().unwrap();
}

#[tauri::command]
fn minimize_window(window: tauri::WebviewWindow) {
    window.minimize().unwrap();
}

#[tauri::command]
fn maximize_window(window: tauri::WebviewWindow) {
    window.maximize().unwrap();
}

#[tauri::command]
fn navigate(url: String) {
    println!("navigate: {}", url);
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            close_window,
            minimize_window,
            maximize_window,
            navigate,
        ])
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();
            window.set_decorations(false)?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Surface");
}