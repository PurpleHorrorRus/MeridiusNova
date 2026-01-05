use tauri::Manager;
use tauri_plugin_store::StoreExt;

#[cfg(not(debug_assertions))]
use crate::server::ServerState;

pub fn handle_window_events(window: &tauri::Window, event: &tauri::WindowEvent) {
	if let tauri::WindowEvent::CloseRequested { .. } = event {
		#[cfg(not(debug_assertions))]
		{
			if let Some(state) = window.app_handle().try_state::<ServerState>() {
				if let Ok(mut child_lock) = state.child.lock() {
					if let Some(child) = child_lock.take() {
						println!("[Sidecar] Terminating server sidecar...");
						let _ = child.kill();
					}
				}
			}
		}
	}

	if let tauri::WindowEvent::Resized(size) = event {
		let app_handle = window.app_handle().clone();
		let width = size.width as f64;
		let height = size.height as f64;

		if let Ok(store) = app_handle.store("window-state.json") {
			let _ = store.set("window_width", width);
			let _ = store.set("window_height", height);
			let _ = store.save();
		}
	}
}

