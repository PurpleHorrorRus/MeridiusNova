#[cfg(not(debug_assertions))]
use serde_json::Value;
#[cfg(not(debug_assertions))]
use std::time::Duration;

#[cfg(not(debug_assertions))]
#[derive(Debug)]
pub struct ServerConfig {
	pub use_remote: bool,
	pub remote_url: String,
}

#[cfg(not(debug_assertions))]
fn normalize_url(url_str: &str, port: Option<u64>) -> String {
	let mut url = url_str.to_string();
	
	if !url.contains("://") {
		url = format!("http://{}", url);
	}

	if let Some(port_val) = port {
		if !url.contains(':') || (!url.contains("://") && url.matches(':').count() <= 1) {
			if url.ends_with('/') {
				url = format!("{}:{}", url.trim_end_matches('/'), port_val);
			} else {
				url = format!("{}:{}", url, port_val);
			}
		} else if let Some(colon_pos) = url.rfind(':') {
			if let Some(slash_pos) = url[colon_pos..].find('/') {
				let after_colon = &url[colon_pos + 1..colon_pos + slash_pos];
				if after_colon.parse::<u16>().is_err() {
					if url.ends_with('/') {
						url = format!("{}:{}", url.trim_end_matches('/'), port_val);
					} else {
						url = format!("{}:{}", url, port_val);
					}
				}
			} else {
				let after_colon = &url[colon_pos + 1..];
				if after_colon.parse::<u16>().is_err() {
					url = format!("{}:{}", url, port_val);
				}
			}
		}
	}

	url
}

#[cfg(not(debug_assertions))]
fn check_healthcheck(url: &str) -> bool {
	let healthcheck_url = if url.ends_with('/') {
		format!("{}api/healthcheck", url)
	} else {
		format!("{}/api/healthcheck", url)
	};

	let client = reqwest::blocking::Client::builder()
		.timeout(Duration::from_secs(5))
		.build();

	if let Ok(client) = client {
		if let Ok(response) = client.get(&healthcheck_url)
			.header("Accept", "application/json")
			.send() {
			if response.status().is_success() {
				if let Ok(json) = response.json::<Value>() {
					if let Some(status) = json.get("status") {
						return status.as_str() == Some("ok");
					}
				}
			}
		}
	}

	false
}

#[cfg(not(debug_assertions))]
pub fn check_from_settings(settings: &Value) -> Option<ServerConfig> {
	let general = settings.get("general")?.as_object()?;
	let server = general.get("server")?.as_object()?;
	
	let enable = server.get("enable")?.as_bool()?;
	let url_str = server.get("url")?.as_str()?;
	
	if !enable || url_str.is_empty() {
		return None;
	}

	let port = server.get("port").and_then(|v| v.as_u64());
	let url = normalize_url(url_str, port);

	if check_healthcheck(&url) {
		Some(ServerConfig {
			use_remote: true,
			remote_url: url,
		})
	} else {
		None
	}
}

