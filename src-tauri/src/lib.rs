mod args;
mod server;
mod server_check;
mod setup;
mod window;

use args::parse_args;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            let (host, port) = parse_args();
            setup::setup_app(app, host, port)
        })
        .on_window_event(|window, event| {
            window::handle_window_events(window, event);
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}