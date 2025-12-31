#[cfg(not(debug_assertions))]
use tauri_plugin_shell::ShellExt;

use tauri::Manager;
use tauri_plugin_store::StoreExt;

#[cfg(not(debug_assertions))]
struct ServerState {
	child: std::sync::Arc<std::sync::Mutex<Option<tauri_plugin_shell::process::CommandChild>>>,
}

#[tauri::command]
fn set_startup(enable: bool) -> Result<(), String> {
	#[cfg(target_os = "windows")]
	{
		use std::process::Command;
		let app_path = std::env::current_exe().map_err(|e| format!("Failed to get exe path: {}", e))?;
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
					"/f"
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
					"/f"
				])
				.output()
				.map_err(|e| format!("Failed to remove startup: {}", e))?;

			if !output.status.success() {
				return Err("Failed to disable startup".to_string());
			}
		}
	}

	#[cfg(not(target_os = "windows"))]
	{
		// TODO: Implement for other platforms
	}

	Ok(())
}

#[derive(serde::Serialize)]
struct AudioDevice {
	device_id: String,
	label: String,
}

#[tauri::command]
fn get_audio_output_devices() -> Result<Vec<AudioDevice>, String> {
	#[cfg(target_os = "windows")]
	{
		use std::process::Command;
		
		let ps_script = r#"
			Add-Type -TypeDefinition @"
				using System;
				using System.Runtime.InteropServices;
				public class AudioDevice {
					[DllImport("winmm.dll")]
					public static extern int waveOutGetNumDevs();
					[DllImport("winmm.dll", CharSet = CharSet.Auto)]
					public static extern int waveOutGetDevCaps(int deviceID, ref WAVEOUTCAPS caps, int size);
					[StructLayout(LayoutKind.Sequential, CharSet = CharSet.Auto)]
					public struct WAVEOUTCAPS {
						public ushort wMid;
						public ushort wPid;
						public uint vDriverVersion;
						[MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)]
						public string szPname;
						public uint dwFormats;
						public ushort wChannels;
						public ushort wReserved1;
						public uint dwSupport;
					}
				}
"@
			$devices = @()
			$deviceCount = [AudioDevice]::waveOutGetNumDevs()
			for ($i = 0; $i -lt $deviceCount; $i++) {
				$caps = New-Object AudioDevice+WAVEOUTCAPS
				$result = [AudioDevice]::waveOutGetDevCaps($i, [ref]$caps, [System.Runtime.InteropServices.Marshal]::SizeOf($caps))
				if ($result -eq 0) {
					$devices += [PSCustomObject]@{
						DeviceId = $i.ToString()
						Label = $caps.szPname.Trim()
					}
				}
			}
			$devices | ConvertTo-Json -Compress
		"#;

		let output = Command::new("powershell")
			.args(&["-NoProfile", "-Command", ps_script])
			.output()
			.map_err(|e| format!("Failed to execute PowerShell: {}", e))?;

		if !output.status.success() {
			let error_msg = String::from_utf8_lossy(&output.stderr);
			return Err(format!("PowerShell error: {}", error_msg));
		}

		let output_str = String::from_utf8_lossy(&output.stdout);
		
		if output_str.trim().is_empty() {
			return Ok(vec![]);
		}

		let devices: Vec<serde_json::Value> = serde_json::from_str(&output_str)
			.map_err(|e| format!("Failed to parse JSON: {}", e))?;

		let mut result: Vec<AudioDevice> = devices
			.into_iter()
			.filter_map(|device| {
				let device_id = device.get("DeviceId")?.as_str()?.to_string();
				let label = device.get("Label")?.as_str()?.to_string();
				Some(AudioDevice { device_id, label })
			})
			.collect();

		result.insert(0, AudioDevice {
			device_id: "default".to_string(),
			label: "Устройство по умолчанию".to_string(),
		});

		Ok(result)
	}

	#[cfg(not(target_os = "windows"))]
	{
		// TODO: Implement for other platforms
		Ok(vec![])
	}
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]

pub fn run() {
	tauri::Builder::default()
		.plugin(tauri_plugin_shell::init())
		.plugin(tauri_plugin_opener::init())
		.plugin(tauri_plugin_store::Builder::new().build())
		.plugin(tauri_plugin_cors_fetch::init())
		.plugin(tauri_plugin_dialog::init())
		.plugin(tauri_plugin_fs::init())
		.plugin(tauri_plugin_http::init())
		.invoke_handler(tauri::generate_handler![set_startup, get_audio_output_devices])
		.setup(|app| {
			#[cfg(desktop)]
			{
				app.handle().plugin(tauri_plugin_global_shortcut::Builder::new().build())?;
			}
			let port = if cfg!(debug_assertions) {
				3000
			} else {
				3001
			};

			#[cfg(not(debug_assertions))]
			{
				let (_rx, child) = app
					.shell()
					.sidecar("server")
					.unwrap()
					.arg(port.to_string())
					.spawn()
					.expect("Failed to spawn server sidecar");

				app.manage(ServerState {
					child: std::sync::Arc::new(std::sync::Mutex::new(Some(child)))
				});

				std::thread::sleep(std::time::Duration::from_secs(2));
			}

			let url = format!("http://localhost:{}", port);

		let (width, height) = if let Ok(store) = app.store("window-state.json") {
			let saved_width = store.get("window_width")
				.and_then(|v| v.as_f64())
				.map(|w| w.max(450.0));
			let saved_height = store.get("window_height")
				.and_then(|v| v.as_f64())
				.map(|h| h.max(550.0));
			
			if let (Some(w), Some(h)) = (saved_width, saved_height) {
				(w, h)
			} else {
				(800.0, 600.0)
			}
		} else {
			(800.0, 600.0)
		};

		let window = tauri::WebviewWindowBuilder::new(
			app,
			"main",
			tauri::WebviewUrl::External(url.parse().unwrap()),
		)
		.title("Meridius")
		.inner_size(width, height)
		.min_inner_size(450.0, 550.0)
		.resizable(true)
		.decorations(false)
		.devtools(true)
		.build()
		.expect("Failed to create window");

		window.open_devtools();

			Ok(())
		})
		.on_window_event(|window, event| {
			if let tauri::WindowEvent::CloseRequested { .. } = event {
				#[cfg(not(debug_assertions))]
				{
					if let Some(state) = window.app_handle().try_state::<ServerState>() {
						if let Ok(mut child_lock) = state.child.lock() {
							if let Some(child) = child_lock.take() {
								println!("Terminating server sidecar...");
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
		})
		.run(tauri::generate_context!())
		.expect("error while running tauri application");
}