pub use reqwest;

use tauri::{
	plugin::{Builder, TauriPlugin},
	Runtime,
};

pub use error::{Error, Result};
mod commands;
mod error;

pub fn init<R: Runtime>() -> TauriPlugin<R> {
	Builder::<R>::new("cors-fetch").invoke_handler(tauri::generate_handler![
		commands::cors_request,
		commands::cancel_cors_request,
	]).build()
}