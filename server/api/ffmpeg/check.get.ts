import fs from "fs-extra";
import path from "path";
import os from "os";

const isExternalServer = (): boolean => {
	return process.env.EXTERNAL_SERVER === "true" || process.env.EXTERNAL_SERVER === "1";
};

const getFFmpegPath = (): string => {
	if (isExternalServer()) {
		return process.env.FFMPEG_BINARY || "";
	}

	const ffmpegDir = path.join(os.homedir(), ".ffmpeg");
	const ffmpegExe = process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";
	const ffmpegPath = path.join(ffmpegDir, ffmpegExe);

	if (fs.existsSync(ffmpegPath)) {
		return ffmpegPath;
	}

	return process.env.FFMPEG_BINARY || "";
};

export default defineEventHandler(async (event) => {
	const ffmpegPath = getFFmpegPath();
	const exists = ffmpegPath !== "" && fs.existsSync(ffmpegPath);

	return {
		exists,
		path: exists ? ffmpegPath : null
	};
});

