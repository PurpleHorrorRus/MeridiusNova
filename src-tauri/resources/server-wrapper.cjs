const { resolve, dirname } = require("node:path");
const { pathToFileURL } = require("node:url");
const { execSync } = require("node:child_process");

const args = process.argv.slice(2).reduce((acc, arg, index, arr) => {
	if (arg.startsWith("--")) {
		const key = arg.slice(2);
		const value = arr[index + 1];

		if (value && !value.startsWith("--")) {
			acc[key] = value;
		} else {
			acc[key] = true;
		}
	}

	return acc;
}, {});

const host = args.host || "127.0.0.1";
const port = parseInt(args.port, 10) || 3000;
const isTauriMode = args.tauri === true;

process.env.PORT = port.toString();
process.env.NITRO_PORT = port.toString();
process.env.HOST = host;

const isTauriProcessRunning = () => {
	if (process.platform === "win32") {
		const result = execSync(`tasklist /FI "IMAGENAME eq "meridius.exe"" /NH`, { encoding: "utf8", timeout: 1000 });
		return result.trim().length > 0 && result.includes("meridius.exe");
	}

	const result = execSync(`pgrep -f "meridius"`, { encoding: "utf8", timeout: 1000 });
	return result.trim().length > 0 && result.includes("meridius");
};

const startParentCheck = () => {
	if (!isTauriMode) {
		console.log("Running in manual mode, skipping parent process check");
		return;
	}

	console.log("Running in Tauri mode, starting parent process check");
	const checkInterval = setInterval(() => {
		if (!isTauriProcessRunning()) {
			console.log("Tauri process (meridius) is no longer running. Shutting down server...");
			clearInterval(checkInterval);
			process.exit(0);
		}
	}, 2000);

	process.on("SIGINT", () => {
		clearInterval(checkInterval);
		process.exit(0);
	});

	process.on("SIGTERM", () => {
		clearInterval(checkInterval);
		process.exit(0);
	});
};

const getServerPath = () => {
	const execDir = dirname(process.execPath);
	const resourcesDir = resolve(execDir, "resources");
	return resolve(resourcesDir, ".output", "server", "index.mjs");
};

const startServer = async () => {
	const serverPath = getServerPath();
	const serverUrl = pathToFileURL(serverPath).href;

	console.log("Starting Nuxt server from:", serverPath);
	console.log("Server URL:", serverUrl);
	console.log("Host:", host);
	console.log("Port:", port);

	startParentCheck();

	await import(serverUrl);
	console.log("Nuxt server started successfully on port", port);
};

startServer().catch((error) => {
	console.error("Failed to start server:", error);
	console.error(error.stack);
	process.exit(1);
});