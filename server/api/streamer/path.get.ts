import path from "path";
import os from "os";

export default defineEventHandler(async (event) => {
	const streamerPath = path.resolve(os.homedir(), ".meridius", "streamer");
	return { path: streamerPath };
});


