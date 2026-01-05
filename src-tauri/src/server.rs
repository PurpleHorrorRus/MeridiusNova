#[cfg(not(debug_assertions))]
use tauri_plugin_shell::ShellExt;

#[cfg(not(debug_assertions))]
pub struct ServerState {
	pub child: std::sync::Arc<std::sync::Mutex<Option<tauri_plugin_shell::process::CommandChild>>>,
}

#[cfg(not(debug_assertions))]
pub fn spawn_sidecar_server(
	app_handle: &tauri::AppHandle,
	host: String,
	port: u16,
) -> tauri_plugin_shell::process::CommandChild {
	println!("[Sidecar] Spawning sidecar server on {}:{}", host, port);
	println!("[Sidecar] Process ID: {}", std::process::id());
	
	let app_handle_clone = app_handle.clone();
	let host_clone = host.clone();
	let port_clone = port;

	let child = tauri::async_runtime::block_on(async move {
		let shell = app_handle_clone.shell();
		let (_rx, child) = shell
			.sidecar("server")
			.expect("Failed to get sidecar")
			.arg("--tauri")
			.arg("--host")
			.arg(host_clone)
			.arg("--port")
			.arg(port_clone.to_string())
			.spawn()
			.expect("Failed to spawn server sidecar");
		
		println!("[Sidecar] Server sidecar spawned successfully");
		println!("[Sidecar] Sidecar PID: {:?}", child.pid());
		child
	});

	child
}
