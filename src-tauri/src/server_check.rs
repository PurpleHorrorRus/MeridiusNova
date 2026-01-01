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

	println!("[DEBUG] normalize_url: input='{}', output='{}'", url_str, result);
	
	result
}

pub fn check_from_settings(settings: &Value) -> Option<ServerConfig> {
	let general = settings.get("general")?.as_object()?;
	let server = general.get("server")?.as_object()?;
	
	let enable = server.get("enable")?.as_bool()?;
	let url_str = server.get("url")?.as_str()?;
	
	if !enable || url_str.is_empty() {
		return None;
	}

	let port = server.get("port").and_then(|v| v.as_u64());
	
	let mut url = url_str.trim().to_string();
	
	println!("[DEBUG] Original URL from settings: {}", url);
	
	if url.starts_with("http://://") {
		url = url.replacen("http://://", "http://", 1);
		println!("[DEBUG] Fixed http://:// to http://");
	} else if url.starts_with("https://://") {
		url = url.replacen("https://://", "https://", 1);
		println!("[DEBUG] Fixed https://:// to https://");
	}
	
	println!("[DEBUG] URL after fix: {}", url);
	
	let url = normalize_url(&url, port);

	Some(ServerConfig {
		use_remote: true,
		remote_url: url,
	})
}

