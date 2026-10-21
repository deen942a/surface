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
    if window.is_maximized().unwrap_or(false) {
        window.unmaximize().unwrap();
    } else {
        window.maximize().unwrap();
    }
}

#[tauri::command]
fn navigate(app: tauri::AppHandle, url: String) -> Result<(), String> {
    let parsed = tauri::Url::parse(&url).map_err(|e| e.to_string())?;

    if let Some(webview) = app.get_webview("content") {
        let _ = webview.navigate(parsed);
        let _ = webview.show();
    } else {
        let window = app.get_webview_window("main").ok_or("main window not found")?;
        let scale = window.scale_factor().unwrap_or(1.0);
        let size = window.inner_size().map_err(|e| e.to_string())?;
        let width = (size.width as f64) / scale;
        let height = ((size.height as f64) / scale - 93.0).max(0.0);

        let builder = tauri::webview::WebviewBuilder::new(
            "content",
            tauri::WebviewUrl::External(parsed),
        );

        window
            .add_child(
                builder,
                tauri::LogicalPosition::new(0.0, 93.0),
                tauri::LogicalSize::new(width, height),
            )
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn show_home(app: tauri::AppHandle) {
    if let Some(webview) = app.get_webview("content") {
        let _ = webview.hide();
    }
}

fn main() {
tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            close_window,
            minimize_window,
            maximize_window,
            navigate,
            show_home,
        ])
.setup(|app| {
            let window = tauri::Window::builder(app, "main")
                .decorations(false)
                .inner_size(1000.0, 700.0)
                .build()?;

            let app_handle = app.handle().clone();
            window.on_window_event(move |event| {
                if let tauri::WindowEvent::Resized(size) = event {
                    if let (Some(win), Some(webview)) = (
                        app_handle.get_window("main"),
                        app_handle.get_webview("content"),
                    ) {
                        let scale = win.scale_factor().unwrap_or(1.0);
                        let width = (size.width as f64) / scale;
                        let height = ((size.height as f64) / scale - 93.0).max(0.0);
                        let _ = webview.set_bounds(tauri::Rect {
                            position: tauri::LogicalPosition::new(0.0, 93.0).into(),
                            size: tauri::LogicalSize::new(width, height).into(),
                        });
                    }
                }
            });

            Ok(())
        })
            let app_handle = app.handle().clone();
            window.on_window_event(move |event| {
                if let tauri::WindowEvent::Resized(size) = event {
                    if let (Some(win), Some(webview)) = (
                        app_handle.get_webview_window("main"),
                        app_handle.get_webview("content"),
                    ) {
                        let scale = win.scale_factor().unwrap_or(1.0);
                        let width = (size.width as f64) / scale;
                        let height = ((size.height as f64) / scale - 93.0).max(0.0);
                        let _ = webview.set_bounds(tauri::Rect {
                            position: tauri::LogicalPosition::new(0.0, 93.0).into(),
                            size: tauri::LogicalSize::new(width, height).into(),
                        });
                    }
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Surface");
}