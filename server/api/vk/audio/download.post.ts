import path from "path";
import fs from "fs-extra";
import os from "os";
import filenamify from "filenamify";

import { getAudioRequestsInstance } from "../audio/audio";
import { AudioDownloader } from "~~/server/utils/audio-downloader";
import { downloadManager, type IAudioDownload } from "~~/server/utils/download-manager";
import { isExternalServer, getDownloadSettings, formatFilename, checkFFmpeg } from "~~/server/utils/download-utils";

import type { TRawResponse } from "~~/server/utils/types";
import type { TAudio, TRawAudio, TReloadAudiosPayload } from "../audio/types";

export default defineEventHandler(async (event) => {
	const audioRequests = getAudioRequestsInstance(event);
	const body = await readBody(event);

	if (!body.audio_id || !body.audio_owner_id || !body.full_id) {
		throw createError({
			statusCode: 400,
			message: "audio_id, audio_owner_id and full_id are required"
		});
	}

	const { downloadPath, template } = await getDownloadSettings();

	const ffmpegCheck = checkFFmpeg();
	if (!ffmpegCheck.exists || !ffmpegCheck.path) {
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

	const rawAudioData = await audioRequests.request<TRawResponse<TReloadAudiosPayload>>({
		act: "reload_audios",
		al: 1,
		audio_ids: `${body.audio_owner_id}_${body.audio_id}`
	}).catch(() => null);

	if (!rawAudioData) {
		throw createError({
			statusCode: 404,
			message: "Audio not found"
		});
	}

	const rawAudiosResult = rawAudioData.payload[1]?.[0];
	
	if (!rawAudiosResult || !Array.isArray(rawAudiosResult) || rawAudiosResult.length === 0) {
		throw createError({
			statusCode: 404,
			message: "Audio not found"
		});
	}

	const rawAudios = rawAudiosResult as TRawAudio[];
	const parsedAudios = await audioRequests.parseAudios(rawAudios, { raw: false });
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
			ffmpeg: ffmpegCheck.path!,
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

