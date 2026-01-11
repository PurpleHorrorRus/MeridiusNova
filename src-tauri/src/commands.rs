#[tauri::command]
pub fn set_startup(enable: bool) -> Result<(), String> {
	#[cfg(target_os = "windows")]
	{
		use std::process::Command;
		let app_path =
			std::env::current_exe().map_err(|e| format!("Failed to get exe path: {}", e))?;
		let app_path_str = app_path.to_string_lossy().to_string();

		if enable {
			let output = Command::new("reg")
				.args(&[
					"add",
					"HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
					"/v",
					"Meridius",
					"/t",
					"REG_SZ",
					"/d",
					&app_path_str,
					"/f",
				])
				.output()
				.map_err(|e| format!("Failed to add startup: {}", e))?;

			if !output.status.success() {
				return Err("Failed to enable startup".to_string());
			}
		} else {
			let output = Command::new("reg")
				.args(&[
					"delete",
					"HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
					"/v",
					"Meridius",
					"/f",
				])
				.output()
				.map_err(|e| format!("Failed to remove startup: {}", e))?;

			if !output.status.success() {
				return Err("Failed to disable startup".to_string());
			}
		}
	}

	#[cfg(target_os = "linux")]
	{
		use std::fs;
		use std::path::PathBuf;

		let app_path =
			std::env::current_exe().map_err(|e| format!("Failed to get exe path: {}", e))?;
		let app_path_str = app_path.to_string_lossy().to_string();

		let home_dir =
			std::env::var("HOME").map_err(|_| "Failed to get HOME directory".to_string())?;

		let autostart_dir = PathBuf::from(&home_dir).join(".config").join("autostart");
		let desktop_file = autostart_dir.join("meridius-nova.desktop");

		if enable {
			fs::create_dir_all(&autostart_dir)
				.map_err(|e| format!("Failed to create autostart directory: {}", e))?;

			let desktop_content = format!(
				"[Desktop Entry]\n\
				 Type=Application\n\
				 Name=Meridius Nova\n\
				 Exec={}\n\
				 Hidden=false\n\
				 NoDisplay=false\n\
				 X-GNOME-Autostart-enabled=true\n",
				app_path_str
			);

			fs::write(&desktop_file, desktop_content)
				.map_err(|e| format!("Failed to write desktop file: {}", e))?;
		} else if desktop_file.exists() {
			fs::remove_file(&desktop_file)
				.map_err(|e| format!("Failed to remove desktop file: {}", e))?;
		}
	}

	Ok(())
}

#[tauri::command]
pub fn check_remote_server(url: String) -> Result<bool, String> {
	use std::time::Duration;

	let healthcheck_url = if url.ends_with('/') {
		format!("{}api/healthcheck", url)
	} else {
		format!("{}/api/healthcheck", url)
	};

	let client = reqwest::blocking::Client::builder()
		.timeout(Duration::from_secs(5))
		.build()
		.map_err(|e| format!("Failed to create HTTP client: {}", e))?;

	match client.get(&healthcheck_url).header("Accept", "application/json").send() {
		Ok(response) => {
			if response.status().is_success() {
				match response.json::<serde_json::Value>() {
					Ok(json) => {
						if let Some(status) = json.get("status") {
							Ok(status.as_str() == Some("ok"))
						} else {
							Ok(false)
						}
					}
					Err(_) => Ok(false),
				}
			} else {
				Ok(false)
			}
		}
		Err(_) => Ok(false),
	}
}

#[tauri::command]
pub fn restart_app(app: tauri::AppHandle) -> Result<(), String> {
	use std::process::Command;
	use std::time::Duration;

	let exe_path =
		std::env::current_exe().map_err(|e| format!("Failed to get exe path: {}", e))?;

	#[cfg(target_os = "windows")]
	{
		Command::new("cmd")
			.args(&["/C", "start", "", &exe_path.to_string_lossy()])
			.spawn()
			.map_err(|e| format!("Failed to restart app: {}", e))?;
	}

	#[cfg(not(target_os = "windows"))]
	{
		Command::new(&exe_path)
			.spawn()
			.map_err(|e| format!("Failed to restart app: {}", e))?;
	}

	std::thread::sleep(Duration::from_millis(500));
	app.exit(0);

	Ok(())
}

