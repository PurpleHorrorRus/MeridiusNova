#[cfg(not(debug_assertions))]
use tauri::Manager;
use tauri_plugin_store::StoreExt;

use crate::server_check::{check_from_settings, check_server_availability};

#[cfg(not(debug_assertions))]
use crate::server::{spawn_sidecar_server, ServerState};

pub fn setup_app(app: &mut tauri::App, host: String, port: u16) -> Result<(), Box<dyn std::error::Error>> {
	println!("[Setup] Parsed host: {}, port: {}", host, port);

	let (use_remote_server, remote_url) = get_server_config(app)?;
	
	let url = if use_remote_server {
		println!("[Setup] Checking remote server availability: {}", remote_url);
		let is_available = check_server_availability(&remote_url);
		
		if is_available {
			println!("[Setup] Remote server is available, using: {}", remote_url);
			remote_url
		} else {
			println!("[Setup] Remote server is not available, spawning sidecar");
			#[cfg(not(debug_assertions))]
			{
				if app.try_state::<ServerState>().is_none() {
					println!("[Setup] Spawning sidecar server (first time)");
					let child = spawn_sidecar_server(app.handle(), host.clone(), port);
					app.manage(ServerState {
						child: std::sync::Arc::new(std::sync::Mutex::new(Some(child))),
					});
					println!("[Setup] Waiting for server to be ready...");
					
					let local_url = format!("http://{}:{}", host, port);
					let mut attempts = 0;
					let max_attempts = 30;
					
					while attempts < max_attempts {
						std::thread::sleep(std::time::Duration::from_millis(500));
						if check_server_availability(&local_url) {
							println!("[Setup] Server is ready!");
							break;
						}
						attempts += 1;
						if attempts % 4 == 0 {
							println!("[Setup] Still waiting for server... (attempt {}/{})", attempts, max_attempts);
						}
					}
					
					if attempts >= max_attempts {
						println!("[Setup] Warning: Server may not be ready, proceeding anyway");
					}
				} else {
					println!("[Setup] Sidecar already spawned, skipping");
				}
			}
			format!("http://{}:{}", host, port)
		}
	} else {
		println!("[Setup] Remote server disabled, spawning sidecar");
		#[cfg(not(debug_assertions))]
		{
			if app.try_state::<ServerState>().is_none() {
				println!("[Setup] Spawning sidecar server (first time)");
				let child = spawn_sidecar_server(app.handle(), host.clone(), port);
				app.manage(ServerState {
					child: std::sync::Arc::new(std::sync::Mutex::new(Some(child))),
				});
				println!("[Setup] Waiting for server to be ready...");
				
				let local_url = format!("http://{}:{}", host, port);
				let mut attempts = 0;
				let max_attempts = 30;
				
				while attempts < max_attempts {
					std::thread::sleep(std::time::Duration::from_millis(500));
					if check_server_availability(&local_url) {
						println!("[Setup] Server is ready!");
						std::thread::sleep(std::time::Duration::from_millis(500));
						break;
					}
					attempts += 1;
					if attempts % 4 == 0 {
						println!("[Setup] Still waiting for server... (attempt {}/{})", attempts, max_attempts);
					}
				}
				
				if attempts >= max_attempts {
					println!("[Setup] Warning: Server may not be ready, proceeding anyway");
				}
			} else {
				println!("[Setup] Sidecar already spawned, skipping");
			}
		}
		format!("http://{}:{}", host, port)
	};

	println!("[Setup] Final URL: {}", url);
	let parsed_url = url::Url::parse(&url).expect("Failed to parse URL");

	let (width, height) = get_window_size(app)?;
	let hardware_acceleration = get_hardware_acceleration_setting(app)?;

	let mut webview_args: Vec<String> = Vec::new();

	webview_args.push("--disable-spell-checking".to_string());
	webview_args.push("--disable-autofill".to_string());
	webview_args.push("--disable-breakpad".to_string());
	webview_args.push("--disable-client-side-phishing-detection".to_string());
	webview_args.push("--disable-component-update".to_string());
	webview_args.push("--disable-default-apps".to_string());
	webview_args.push("--disable-features=TranslateUI".to_string());
	webview_args.push("--disable-notifications".to_string());
	webview_args.push("--disable-password-generation".to_string());
	webview_args.push("--disable-prompt-on-repost".to_string());
	webview_args.push("--disable-sync".to_string());
	webview_args.push("--disable-translate".to_string());
	webview_args.push("--no-first-run".to_string());
	webview_args.push("--no-default-browser-check".to_string());
	webview_args.push("--safebrowsing-disable-auto-update".to_string());

	if !hardware_acceleration {
		webview_args.push("--disable-gpu".to_string());
		webview_args.push("--disable-software-rasterizer".to_string());
		println!("[Setup] Hardware acceleration disabled");
	} else {
		println!("[Setup] Hardware acceleration enabled (default for WebView2)");
	}

	#[cfg(target_os = "windows")]
	{
		if !webview_args.is_empty() {
			let args_string = webview_args.join(" ");
			unsafe {
				std::env::set_var("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS", &args_string);
			}
			println!("[Setup] WebView2 arguments: {}", args_string);
		}
	}


	#[allow(unused_variables)]
	let window = tauri::WebviewWindowBuilder::new(
		app,
		"main",
		tauri::WebviewUrl::External(parsed_url),
	)
	.title("Meridius")
	.inner_size(width, height)
	.min_inner_size(450.0, 550.0)
	.resizable(true)
	.decorations(false)
	.devtools(true)
	.user_agent("Meridius-Nova-Tauri/1.0")
	.build()
	.expect("Failed to create window");

	Ok(())
}


fn get_server_config(app: &tauri::App) -> Result<(bool, String), Box<dyn std::error::Error>> {
	let config = if let Ok(store) = app.store(".settings.dat") {
		if let Some(settings_value) = store.get("settings") {
			check_from_settings(&settings_value)
		} else {
			None
		}
	} else {
		None
	};

	match config {
		Some(config) if config.use_remote => {
			println!("[Server Config] Remote server enabled: {}", config.remote_url);
			Ok((config.use_remote, config.remote_url))
		},
		_ => {
			println!("[Server Config] Remote server disabled, using local");
			Ok((false, String::new()))
		},
	}
}

fn get_hardware_acceleration_setting(app: &tauri::App) -> Result<bool, Box<dyn std::error::Error>> {
	if let Ok(store) = app.store(".settings.dat") {
		if let Some(settings_value) = store.get("settings") {
			if let Some(settings_obj) = settings_value.as_object() {
				if let Some(window_obj) = settings_obj.get("window").and_then(|v| v.as_object()) {
					if let Some(hw_accel) = window_obj.get("hardwareAcceleration") {
						if let Some(value) = hw_accel.as_bool() {
							return Ok(value);
						}
					}
				}
			}
		}
	}
	Ok(false)
}

fn get_window_size(app: &tauri::App) -> Result<(f64, f64), Box<dyn std::error::Error>> {
	if let Ok(store) = app.store("window-state.json") {
		let saved_width = store
			.get("window_width")
			.and_then(|v| v.as_f64())
			.map(|w| w.max(450.0));
		let saved_height = store
			.get("window_height")
			.and_then(|v| v.as_f64())
			.map(|h| h.max(550.0));

		if let (Some(w), Some(h)) = (saved_width, saved_height) {
			Ok((w, h))
		} else {
			Ok((800.0, 600.0))
		}
	} else {
		Ok((800.0, 600.0))
	}
}

