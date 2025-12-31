const { resolve, dirname } = require("node:path");
const { pathToFileURL } = require("node:url");

const port = process.argv[2] || "3001";

process.env.PORT = port;
process.env.NITRO_PORT = port;

function getServerPath() {
	const execDir = dirname(process.execPath);
	const resourcesDir = resolve(execDir, "resources");
	return resolve(resourcesDir, ".output", "server", "index.mjs");
}

async function startServer() {
	const serverPath = getServerPath();
	const serverUrl = pathToFileURL(serverPath).href;

	console.log("Starting Nuxt server from:", serverPath);
	console.log("Server URL:", serverUrl);
	console.log("Port:", port);

	await import(serverUrl);
	console.log("Nuxt server started successfully on port", port);
}

startServer().catch((error) => {
	console.error("Failed to start server:", error);
	console.error(error.stack);
	process.exit(1);
});