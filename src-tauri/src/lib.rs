#[cfg(not(debug_assertions))]
use tauri_plugin_shell::ShellExt;

use tauri::Manager;
use tauri_plugin_store::StoreExt;
use url::Url;

mod server_check;

use server_check::check_from_settings;

#[cfg(not(debug_assertions))]
struct ServerState {
    child: std::sync::Arc<std::sync::Mutex<Option<tauri_plugin_shell::process::CommandChild>>>,
}

#[tauri::command]
fn set_startup(enable: bool) -> Result<(), String> {
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

    #[cfg(target_os = "macos")]
    {
        // TODO: Implement for macOS using Launch Agents
        let _ = enable;
    }

    Ok(())
}

#[tauri::command]
fn check_remote_server(url: String) -> Result<bool, String> {
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
fn restart_app(app: tauri::AppHandle) -> Result<(), String> {
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
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_os::init())
        .invoke_handler(tauri::generate_handler![
            set_startup,
            check_remote_server,
            restart_app
        ])
        .setup(|app| {
            #[cfg(desktop)]
            {
                app.handle()
                    .plugin(tauri_plugin_global_shortcut::Builder::new().build())?;
            }
            let port = if cfg!(debug_assertions) { 3000 } else { 3001 };

            let (use_remote_server, remote_url) = {
                let config = if let Ok(store) = app.store(".settings.dat") {
                    println!("[DEBUG] Store opened successfully");
                    if let Some(settings_value) = store.get("settings") {
                        println!("[DEBUG] Found settings in store");
                        if let Some(config) = check_from_settings(&settings_value) {
                            println!("[DEBUG] Server config parsed: use_remote={}, url={}", config.use_remote, config.remote_url);
                            Some(config)
                        } else {
                            println!("[DEBUG] Failed to parse server config from settings");
                            None
                        }
                    } else {
                        println!("[DEBUG] No 'settings' key in store");
                        None
                    }
                } else {
                    println!("[DEBUG] Failed to open store");
                    None
                };

                match config {
                    Some(config) if config.use_remote => {
                        println!("[DEBUG] Using remote server: {}", config.remote_url);
                        (config.use_remote, config.remote_url)
                    },
                    _ => {
                        println!("[DEBUG] Using local server on port {}", port);
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
                                child: std::sync::Arc::new(std::sync::Mutex::new(Some(child))),
                            });

                            std::thread::sleep(std::time::Duration::from_secs(2));
                        }
                        (false, String::new())
                    }
                }
            };

            let url = if use_remote_server {
                println!("[DEBUG] Final URL: {}", remote_url);
                match Url::parse(&remote_url) {
                    Ok(parsed_url) => {
                        if parsed_url.host().is_none() {
                            println!("[DEBUG] Invalid URL: empty host, falling back to localhost");
                            format!("http://localhost:{}", port)
                        } else {
                            remote_url
                        }
                    },
                    Err(e) => {
                        println!("[DEBUG] Failed to parse URL '{}': {:?}, falling back to localhost", remote_url, e);
                        format!("http://localhost:{}", port)
                    }
                }
            } else {
                let local_url = format!("http://localhost:{}", port);
                println!("[DEBUG] Final URL: {}", local_url);
                local_url
            };

            let (width, height) = if let Ok(store) = app.store("window-state.json") {
                let saved_width = store
                    .get("window_width")
                    .and_then(|v| v.as_f64())
                    .map(|w| w.max(450.0));
                let saved_height = store
                    .get("window_height")
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

            let parsed_url = Url::parse(&url).expect("Failed to parse URL");
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