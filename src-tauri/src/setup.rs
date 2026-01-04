use tauri_plugin_store::StoreExt;
use url::Url;

use crate::server_check::check_from_settings;

#[cfg(not(debug_assertions))]
use crate::server::{spawn_sidecar_server, ServerState};

pub fn setup_app(app: &mut tauri::App, host: String, port: u16) -> Result<(), Box<dyn std::error::Error>> {
	#[cfg(desktop)]
	{
		app.handle()
			.plugin(tauri_plugin_global_shortcut::Builder::new().build())?;
	}

	let (use_remote_server, remote_url) = get_server_config(app)?;

	let url = if use_remote_server {
		check_and_get_url(app, &remote_url, &host, port)?
	} else {
		#[cfg(not(debug_assertions))]
		{
			let child = spawn_sidecar_server(app.handle(), host.clone(), port);
			app.manage(ServerState {
				child: std::sync::Arc::new(std::sync::Mutex::new(Some(child))),
			});
			std::thread::sleep(std::time::Duration::from_secs(2));
		}
		format!("http://{}:{}", host, port)
	};

	let (width, height) = get_window_size(app)?;
	let parsed_url = Url::parse(&url).expect("Failed to parse URL");

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
	.devtools(cfg!(debug_assertions))
	.build()
	.expect("Failed to create window");

	#[cfg(debug_assertions)]
	{
		window.open_devtools();
	}

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
		Some(config) if config.use_remote => Ok((config.use_remote, config.remote_url)),
		_ => Ok((false, String::new())),
	}
}

fn check_and_get_url(
	_app: &tauri::App,
	remote_url: &str,
	host: &str,
	port: u16,
) -> Result<String, Box<dyn std::error::Error>> {
	let healthcheck_url = if remote_url.ends_with('/') {
		format!("{}api/healthcheck", remote_url)
	} else {
		format!("{}/api/healthcheck", remote_url)
	};

	let client = reqwest::blocking::Client::builder()
		.timeout(std::time::Duration::from_secs(3))
		.build();

	let is_available = if let Ok(client) = client {
		match client.get(&healthcheck_url).header("Accept", "application/json").send() {
			Ok(response) => {
				if response.status().is_success() {
					match response.json::<serde_json::Value>() {
						Ok(json) => {
							if let Some(status) = json.get("status") {
								status.as_str() == Some("ok")
							} else {
								false
							}
						}
						Err(_) => false,
					}
				} else {
					false
				}
			}
			Err(_) => false,
		}
	} else {
		false
	};

	if is_available {
		match Url::parse(remote_url) {
			Ok(parsed_url) => {
				if parsed_url.host().is_none() {
					Ok(format!("http://{}:{}", host, port))
				} else {
					Ok(remote_url.to_string())
				}
			}
			Err(_) => Ok(format!("http://{}:{}", host, port)),
		}
	} else {
		#[cfg(not(debug_assertions))]
		{
			disable_remote_server_in_settings(_app)?;
			let child = spawn_sidecar_server(_app.handle(), host.to_string(), port);
			_app.manage(ServerState {
				child: std::sync::Arc::new(std::sync::Mutex::new(Some(child))),
			});
			std::thread::sleep(std::time::Duration::from_secs(2));
		}
		Ok(format!("http://{}:{}", host, port))
	}
}

#[cfg(not(debug_assertions))]
fn disable_remote_server_in_settings(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
	if let Ok(store) = app.store(".settings.dat") {
		if let Some(settings_value) = store.get("settings") {
			if let Some(mut settings) = settings_value.as_object().cloned() {
				if let Some(general) = settings.get("general").and_then(|v| v.as_object()).cloned() {
					let mut general = general.clone();
					if let Some(server) = general.get("server").and_then(|v| v.as_object()).cloned() {
						let mut server = server.clone();
						server.insert("enable".to_string(), serde_json::Value::Bool(false));
						general.insert("server".to_string(), serde_json::Value::Object(server));
						settings.insert("general".to_string(), serde_json::Value::Object(general));
						let _ = store.set("settings", serde_json::Value::Object(settings));
						let _ = store.save();
					}
				}
			}
		}
	}
	Ok(())
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

