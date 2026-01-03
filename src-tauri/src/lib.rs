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
            #[cfg(desktop)]
            {
                app.handle()
                    .plugin(tauri_plugin_global_shortcut::Builder::new().build())?;
            }
            let port = if cfg!(debug_assertions) { 3000 } else { 3001 };

            let (use_remote_server, remote_url) = {
                let config = if let Ok(store) = app.store(".settings.dat") {
                    if let Some(settings_value) = store.get("settings") {
                        if let Some(config) = check_from_settings(&settings_value) {
                            Some(config)
                        } else {
                            None
                        }
                    } else {
                        None
                    }
                } else {
                    None
                };

                match config {
                    Some(config) if config.use_remote => {
                        (config.use_remote, config.remote_url)
                    },
                    _ => {
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
                    match Url::parse(&remote_url) {
                        Ok(parsed_url) => {
                            if parsed_url.host().is_none() {
                                format!("http://localhost:{}", port)
                            } else {
                                remote_url
                            }
                        },
                        Err(_) => {
                            format!("http://localhost:{}", port)
                        }
                    }
                } else {
                    #[cfg(not(debug_assertions))]
                    {
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
                    format!("http://localhost:{}", port)
                }
            } else {
                format!("http://localhost:{}", port)
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