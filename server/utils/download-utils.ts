import fs from "fs-extra";
import os from "os";
import path from "path";

import type { TAudio } from "~~/server/api/vk/audio/types";

export const isExternalServer = (): boolean => {
	return process.env.EXTERNAL_SERVER === "true" || process.env.EXTERNAL_SERVER === "1";
};

export const getFFmpegPath = (): string => {
	if (isExternalServer()) {
		const ffmpegDir = path.join(os.homedir(), ".meridius", "ffmpeg");
		const ffmpegExe = process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";
		const ffmpegPath = path.join(ffmpegDir, ffmpegExe);

		if (fs.existsSync(ffmpegPath)) {
			return ffmpegPath;
		}

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

export const checkFFmpeg = (): { exists: boolean; path: string | null } => {
	const ffmpegPath = getFFmpegPath();
	const exists = ffmpegPath !== "" && fs.existsSync(ffmpegPath);

	return {
		exists,
		path: exists ? ffmpegPath : null
	};
};

export const getDownloadSettings = async (): Promise<{ downloadPath: string; template: string; ffmpegPath: string; concurrency: number }> => {
	const settingsFile = path.resolve(os.homedir(), ".meridius", "settings.json");
	let downloadPath = path.join(os.homedir(), "Music");
	let template = "{{ performer }} - {{ title }}";
	let concurrency = 2;

	if (isExternalServer()) {
		downloadPath = os.tmpdir();
	} else if (fs.pathExistsSync(settingsFile)) {
		const settings = await fs.readJson(settingsFile) as any;
		if (settings.download?.path) {
			downloadPath = settings.download.path;
		}
		if (settings.download?.template) {
			template = settings.download.template;
		}
		if (settings.optimization?.download) {
			if (settings.optimization.download.auto) {
				concurrency = Math.round(os.cpus().length / 2);
			} else {
				concurrency = settings.optimization.download.fixed || 2;
			}
		}
	}

	return {
		downloadPath,
		template,
		ffmpegPath: getFFmpegPath(),
		concurrency
	};
};

export const formatFilename = (template: string, audio: TAudio, index?: number): string => {
	return template
		.replace(/\{\{\s*index\s*\}\}/g, index !== undefined ? String(index + 1) : "")
		.replace(/\{\{\s*performer\s*\}\}/g, audio.performer || "")
		.replace(/\{\{\s*title\s*\}\}/g, audio.title || "")
		.replace(/\{\{\s*id\s*\}\}/g, String(audio.id))
		.replace(/\{\{\s*owner\s*\}\}/g, String(audio.owner_id))
		.trim();
};
