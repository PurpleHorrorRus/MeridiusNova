use serde_json::Value;

#[derive(Debug)]
pub struct ServerConfig {
	pub use_remote: bool,
	pub remote_url: String,
}

fn normalize_url(url_str: &str, port: Option<u64>) -> String {
	let mut url = url_str.trim().to_string();
	
	if url.is_empty() {
		return "http://localhost:3001/".to_string();
	}

	if url.starts_with("http://://") || url.starts_with("https://://") {
		url = url.replace("://://", "://");
	}

	let protocol = if url.starts_with("https://") {
		"https"
	} else if url.starts_with("http://") {
		"http"
	} else {
		"http"
	};

	let host_and_path = if url.starts_with("http://") {
		&url[7..]
	} else if url.starts_with("https://") {
		&url[8..]
	} else {
		&url[..]
	};

	if host_and_path.is_empty() {
		return "http://localhost:3001/".to_string();
	}

	let host_part = host_and_path.split('/').next().unwrap_or(host_and_path);
	
	if host_part.is_empty() {
		return "http://localhost:3001/".to_string();
	}

	let (host, existing_port) = if let Some(colon_pos) = host_part.find(':') {
		let h = &host_part[..colon_pos];
		let p = &host_part[colon_pos + 1..];
		if p.parse::<u16>().is_ok() {
			(h, Some(p.to_string()))
		} else {
			(host_part, None)
		}
	} else {
		(host_part, None)
	};

	if host.is_empty() {
		return "http://localhost:3001/".to_string();
	}

	let path = if let Some(slash_pos) = host_and_path.find('/') {
		&host_and_path[slash_pos..]
	} else {
		""
	};

	let result = if let Some(ref p) = existing_port {
		format!("{}://{}:{}{}/", protocol, host, p, path)
	} else if let Some(port_val) = port {
		format!("{}://{}:{}{}/", protocol, host, port_val, path)
	} else {
		format!("{}://{}{}/", protocol, host, path)
	};

	result
}

pub fn check_from_settings(settings: &Value) -> Option<ServerConfig> {
	let general = settings.get("general")?.as_object()?;
	let server = general.get("server")?.as_object()?;
	
	let server_type = server.get("type")
		.and_then(|v| v.as_str())
		.unwrap_or("local");
	
	if server_type == "local" {
		return None;
	}
	
	let enable = server.get("enable")?.as_bool()?;
	let url_str = server.get("url")?.as_str()?;
	
	if !enable || url_str.is_empty() {
		return None;
	}

	let port = server.get("port").and_then(|v| v.as_u64());
	
	let mut url = url_str.trim().to_string();
	
	if url.starts_with("http://://") {
		url = url.replacen("http://://", "http://", 1);
	} else if url.starts_with("https://://") {
		url = url.replacen("https://://", "https://", 1);
	}
	
	let url = normalize_url(&url, port);

	Some(ServerConfig {
		use_remote: true,
		remote_url: url,
	})
}

pub fn check_server_availability(remote_url: &str) -> bool {
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

	is_available
}

