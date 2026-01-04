mod args;
mod commands;
mod server;
mod server_check;
mod setup;
mod window;

use args::parse_args;
use commands::{check_remote_server, restart_app, set_startup};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(target_os = "windows")]
    {
        use std::env;
        unsafe {
            let _ = env::set_var("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS", "--disable-background-networking --disable-background-timer-throttling --disable-backgrounding-occluded-windows --disable-breakpad --disable-client-side-phishing-detection --disable-component-update --disable-default-apps --disable-dev-shm-usage --disable-extensions --disable-features=TranslateUI --disable-hang-monitor --disable-ipc-flooding-protection --disable-popup-blocking --disable-prompt-on-repost --disable-renderer-backgrounding --disable-sync --disable-translate --disable-web-resources --metrics-recording-only --no-first-run --no-pings --no-default-browser-check --safebrowsing-disable-auto-update --enable-automation --password-store=basic --use-mock-keychain --disable-features=RendererCodeIntegrity --aggressive-cache-discard --memory-pressure-off");
        }
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_cors_fetch::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_os::init())
        .invoke_handler(tauri::generate_handler![
            set_startup,
            check_remote_server,
            restart_app
        ])
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