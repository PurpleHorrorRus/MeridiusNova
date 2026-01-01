const { pathToFileURL } = require("node:url");
const { resolve } = require("node:path");

const port = process.env.PORT || process.env.NITRO_PORT || "3001";

process.env.PORT = port;
process.env.NITRO_PORT = port;

async function startServer() {
	const serverPath = resolve(__dirname, ".output", "server", "index.mjs");
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

