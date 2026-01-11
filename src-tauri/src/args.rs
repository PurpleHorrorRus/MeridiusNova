pub fn parse_args() -> (String, u16) {
	let args: Vec<String> = std::env::args().collect();
	let mut host = "127.0.0.1".to_string();
	let mut port: Option<u16> = None;

	let mut index = 0;
	while index < args.len() {
		if args[index] == "--host" && index + 1 < args.len() {
			host = args[index + 1].clone();
			index += 2;
		} else if args[index] == "--port" && index + 1 < args.len() {
			if let Ok(parsed_port) = args[index + 1].parse::<u16>() {
				port = Some(parsed_port);
			}
			index += 2;
		} else {
			index += 1;
		}
	}

	let final_port = if let Some(port_value) = port {
		port_value
	} else {
		get_default_port()
	};

	(host, final_port)
}

#[cfg(debug_assertions)]
fn get_default_port() -> u16 {
	3000
}

#[cfg(not(debug_assertions))]
fn get_default_port() -> u16 {
	get_random_port()
}

#[cfg(not(debug_assertions))]
fn get_random_port() -> u16 {
	use std::net::TcpListener;

	if let Ok(listener) = TcpListener::bind("127.0.0.1:0") {
		if let Ok(addr) = listener.local_addr() {
			return addr.port();
		}
	}

	use std::time::{SystemTime, UNIX_EPOCH};
	let seed = SystemTime::now()
		.duration_since(UNIX_EPOCH)
		.unwrap()
		.as_nanos() as u64;

	for attempt in 0..100 {
		let random_port = 3000 + ((seed + attempt as u64) % 7000) as u16;
		if TcpListener::bind(format!("127.0.0.1:{}", random_port)).is_ok() {
			return random_port;
		}
	}

	3000
}

