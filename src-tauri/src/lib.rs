mod args;
mod commands;
mod server;
mod server_check;
mod setup;
mod window;

use args::parse_args;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
	let mut builder = tauri::Builder::default();

	#[cfg(desktop)]
	{
		builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
			if let Some(window) = app.get_webview_window("main") {
				let _ = window.show();
				let _ = window.set_focus();
			}
		}));
	}

	builder
		.plugin(tauri_plugin_shell::init())
		.plugin(tauri_plugin_opener::init())
		.plugin(tauri_plugin_store::Builder::new().build())
		.plugin(tauri_plugin_dialog::init())
		.plugin(tauri_plugin_fs::init())
		.plugin(tauri_plugin_updater::Builder::new().build())
		.plugin(tauri_plugin_os::init())
		.plugin(tauri_plugin_global_shortcut::Builder::new().build())
		.invoke_handler(tauri::generate_handler![
			commands::set_startup,
			commands::check_remote_server,
			commands::restart_app
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