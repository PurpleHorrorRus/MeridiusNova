import path from "path";
import fs from "fs-extra";
import os from "os";
import filenamify from "filenamify";

import { getAudioRequestsInstance } from "../audio/audio";
import { AudioDownloader } from "~~/server/utils/audio-downloader";
import { downloadManager, type IAudioDownload } from "~~/server/utils/download-manager";

import type { TAudio } from "../audio/types";

const isExternalServer = (): boolean => {
	return process.env.EXTERNAL_SERVER === "true" || process.env.EXTERNAL_SERVER === "1";
};

const getSettings = async (): Promise<{ downloadPath: string; template: string; ffmpegPath: string }> => {
	const settingsFile = path.resolve(os.homedir(), ".meridius", "settings.json");
	let downloadPath = path.join(os.homedir(), "Music");
	let template = "{{ performer }} - {{ title }}";
	let ffmpegPath = "";

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
	}

	if (isExternalServer()) {
		const ffmpegDir = path.join(os.homedir(), ".meridius", "ffmpeg");
		const ffmpegExe = process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";
		ffmpegPath = path.join(ffmpegDir, ffmpegExe);
	} else {
		const ffmpegDir = path.join(os.homedir(), ".ffmpeg");
		const ffmpegExe = process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";
		ffmpegPath = path.join(ffmpegDir, ffmpegExe);

		if (!fs.existsSync(ffmpegPath)) {
			ffmpegPath = process.env.FFMPEG_BINARY || "";
		}
	}

	return { downloadPath, template, ffmpegPath };
};

const formatFilename = (template: string, audio: TAudio, index?: number): string => {
	return template
		.replace(/\{\{\s*index\s*\}\}/g, index !== undefined ? String(index + 1) : "")
		.replace(/\{\{\s*performer\s*\}\}/g, audio.performer || "")
		.replace(/\{\{\s*title\s*\}\}/g, audio.title || "")
		.replace(/\{\{\s*id\s*\}\}/g, String(audio.id))
		.replace(/\{\{\s*owner\s*\}\}/g, String(audio.owner_id))
		.trim();
};

export default defineEventHandler(async (event) => {
	const audioRequests = getAudioRequestsInstance(event);
	const body = await readBody(event);

	if (!body.audio_id || !body.audio_owner_id || !body.full_id) {
		throw createError({
			statusCode: 400,
			message: "audio_id, audio_owner_id and full_id are required"
		});
	}

	const { downloadPath, template, ffmpegPath } = await getSettings();

	if (!ffmpegPath || !fs.existsSync(ffmpegPath)) {
		throw createError({
			statusCode: 400,
			message: "FFmpeg not installed. Please install FFmpeg first."
		});
	}

	if (!downloadPath) {
		throw createError({
			statusCode: 400,
			message: "Download path not configured. Please set download path in settings."
		});
	}

	const downloadId = downloadManager.generateId();

	const rawAudioData = await audioRequests.request({
		act: "reload_audios",
		al: 1,
		audio_ids: `${body.audio_owner_id}_${body.audio_id}`
	}).then(async (response) => {
		const rawAudios = response.payload[1][0] as any[];
		if (!rawAudios || rawAudios.length === 0) {
			return null;
		}

		return rawAudios[0];
	}).catch(() => {
		return null;
	});

	if (!rawAudioData) {
		throw createError({
			statusCode: 404,
			message: "Audio not found"
		});
	}

	const parsedAudios = await audioRequests.parseAudios([rawAudioData], { raw: false });
	const audio = parsedAudios[0];

	if (!audio || !audio.url) {
		throw createError({
			statusCode: 404,
			message: "Audio URL not found"
		});
	}

	const filename = formatFilename(template, audio);
	const outputPath = path.resolve(downloadPath);

	if (!fs.existsSync(outputPath)) {
		fs.mkdirsSync(outputPath);
	}

	const download: IAudioDownload = {
		downloadId,
		type: "audio",
		status: "queued",
		percent: 0,
		audio,
		outputPath
	};

	downloadManager.addDownload(download);

	setImmediate(async () => {
		downloadManager.updateDownload(downloadId, { status: "preparing", percent: 5 });

		const chunksPath = path.resolve(os.tmpdir(), `meridius_download_${downloadId}`);
		const name = filenamify(filename);

		const downloader = new AudioDownloader(audio, {
			ffmpeg: ffmpegPath,
			output: outputPath,
			name,
			chunks: chunksPath,
			delete: isExternalServer(),
			concurrency: 5,
			metadata: [],
			onProgress: (percent: number) => {
				downloadManager.updateDownload(downloadId, {
					status: "downloading",
					percent: Math.min(95, 5 + (percent * 0.9))
				});
			},
			onProcessing: () => {
				downloadManager.updateDownload(downloadId, {
					status: "processing",
					percent: 95
				});
			}
		});

		await downloader.download().then((result) => {
			let filePath: string;

			if (isExternalServer()) {
				const tmpFilePath = path.join(os.tmpdir(), `${downloadId}_${name}.mp3`);
				fs.writeFileSync(tmpFilePath, result as Buffer);
				filePath = tmpFilePath;
			} else {
				filePath = path.join(outputPath, `${name}.mp3`);
			}

			downloadManager.updateDownload(downloadId, {
				status: "completed",
				percent: 100,
				filePath
			});
		}).catch((error: Error) => {
			downloadManager.updateDownload(downloadId, {
				status: "failed",
				error: error.message
			});
		});
	});

	return {
		success: true,
		downloadId
	};
});

