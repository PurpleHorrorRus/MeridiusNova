import Bluebird from "bluebird";
import fs from "fs-extra";
import filenamify from "filenamify";
import os from "os";
import path from "path";
import AdmZip from "adm-zip";

import { getAudioRequestsInstance } from "../audio/audio";
import { getPlaylistsRequestsInstance } from "../playlists/playlists";
import { AudioDownloader } from "~~/server/utils/audio-downloader";
import { downloadManager } from "~~/server/utils/download-manager";
import { getAudioUrls } from "../audio/url.get";

import type { TAudio } from "../audio/types";
import type { IPlaylistDownload } from "~~/server/utils/download-manager";

const isExternalServer = (): boolean => {
	return process.env.EXTERNAL_SERVER === "true" || process.env.EXTERNAL_SERVER === "1";
};

const getSettings = async (): Promise<{ downloadPath: string; template: string; ffmpegPath: string; concurrency: number }> => {
	const settingsFile = path.resolve(os.homedir(), ".meridius", "settings.json");
	let downloadPath = path.join(os.homedir(), "Music");
	let template = "{{ performer }} - {{ title }}";
	let ffmpegPath = "";
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

	return { downloadPath, template, ffmpegPath, concurrency };
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
	const playlistsRequests = getPlaylistsRequestsInstance(event);
	const audioRequests = getAudioRequestsInstance(event);
	const body = await readBody(event);

	if (!body.playlist_id || !body.owner_id) {
		throw createError({
			statusCode: 400,
			message: "playlist_id and owner_id are required"
		});
	}

	const clientType = getHeader(event, "x-client-type") || "browser";
	const isBrowser = clientType === "browser";

	const { downloadPath, template, ffmpegPath, concurrency } = await getSettings();

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

	const playlist = await playlistsRequests.getPlaylist({
		owner_id: Number(body.owner_id),
		playlist_id: Number(body.playlist_id),
		access_hash: body.access_hash as string | undefined,
		list: true
	});

	if (!playlist) {
		throw createError({
			statusCode: 404,
			message: "Playlist not found"
		});
	}

	const download: IPlaylistDownload = {
		downloadId,
		type: "playlist",
		status: "queued",
		percent: 0,
		playlist,
		downloaded: 0,
		total: 0
	};

	downloadManager.addDownload(download);

	setImmediate(async () => {
		downloadManager.updateDownload(downloadId, { status: "preparing", percent: 0 });

		const playlistFolder = filenamify(`${playlist.title}_${playlist.owner_id}_${playlist.playlist_id}`);
		const outputPath = isExternalServer()
			? path.resolve(os.tmpdir(), `meridius_playlist_${downloadId}`, playlistFolder)
			: path.resolve(downloadPath, playlistFolder);

		if (!fs.existsSync(outputPath)) {
			fs.mkdirsSync(outputPath);
		}

		let allAudios: TAudio[] = [];
		let more = playlist.more;

		while (true) {
			const response = await playlistsRequests.getPlaylist({
				owner_id: playlist.owner_id,
				playlist_id: playlist.playlist_id,
				access_hash: playlist.access_hash,
				list: true,
				count: 1000,
				offset: allAudios.length
			});

			if (!response || !response.list || response.list.length === 0) {
				break;
			}

			allAudios = allAudios.concat(response.list);
			more = response.more;

			if (!more || !more.next_from) {
				break;
			}
		}

		const audios = allAudios.filter(audio => audio && !audio.is_restriction);

		if (audios.length === 0) {
			downloadManager.updateDownload(downloadId, {
				status: "failed",
				error: "No audios found in playlist"
			});
			return;
		}

		const audiosWithoutUrl = audios.filter(audio => !audio.url || !audio.url.trim());
		const fullIdsToFetch = audiosWithoutUrl.map(audio => audio.full_id);

		if (fullIdsToFetch.length > 0) {
			const [urlError, urlResult] = await getAudioUrls(event, fullIdsToFetch, false).then(
				(result) => [null, result] as const,
				(error: Error) => [error, null] as const
			);

			if (urlError) {
				console.error(`Failed to get audio URLs:`, urlError.message || urlError);
			} else if (urlResult) {
				for (const audio of audiosWithoutUrl) {
					if (urlResult[audio.full_id]) {
						audio.url = urlResult[audio.full_id];
					}
				}
			}
		}

		const audiosWithUrl = audios.filter(audio => audio.url && audio.url.trim());

		if (audiosWithUrl.length === 0) {
			downloadManager.updateDownload(downloadId, {
				status: "failed",
				error: "No audios with valid URLs found in playlist"
			});
			return;
		}

		downloadManager.updateDownload(downloadId, {
			total: audiosWithUrl.length,
			status: "downloading",
			percent: 0
		});

		let downloaded = 0;

		await Bluebird.map(audiosWithUrl, async (audio, index) => {
			if (downloadManager.getDownload(downloadId)?.status === "failed") {
				return;
			}

			downloadManager.updateDownload(downloadId, {
				currentAudio: audio
			});

			const filename = formatFilename(template, audio, index);
			const chunksPath = path.resolve(os.tmpdir(), `meridius_download_${downloadId}_${audio.id}`);
			const name = filenamify(filename);

			const downloader = new AudioDownloader(audio, {
				ffmpeg: ffmpegPath,
				output: outputPath,
				name,
				chunks: chunksPath,
				delete: false,
				concurrency: 5,
				metadata: [["track", `${index + 1}/${audiosWithUrl.length}`]],
				onProgress: (percent: number) => {
					const basePercent = (downloaded / audiosWithUrl.length) * 100;
					const currentPercent = (percent / audiosWithUrl.length);
					downloadManager.updateDownload(downloadId, {
						percent: Math.min(99, basePercent + currentPercent)
					});
				},
				onProcessing: () => {
					downloadManager.updateDownload(downloadId, {
						status: "processing"
					});
				}
			});

			await downloader.download().then(() => {
				downloaded++;
				downloadManager.updateDownload(downloadId, {
					downloaded,
					percent: (downloaded / audiosWithUrl.length) * 100
				});
			}).catch((error: Error) => {
				console.error(`Failed to download audio ${audio.full_id}:`, error.message || error);
				downloaded++;
				downloadManager.updateDownload(downloadId, {
					downloaded,
					percent: (downloaded / audiosWithUrl.length) * 100
				});
			});
		}, { concurrency });

		let zipPath: string | undefined;

		if (isBrowser) {
			downloadManager.updateDownload(downloadId, {
				status: "processing",
				percent: 99
			});

			const zipFilename = `${playlistFolder}.zip`;
			const zipDir = path.resolve(os.tmpdir(), `meridius_playlist_${downloadId}`);
			zipPath = path.resolve(zipDir, zipFilename);
			const zip = new AdmZip();

			const files = await fs.readdir(outputPath);
			for (const file of files) {
				const filePath = path.join(outputPath, file);
				const stat = await fs.stat(filePath);
				if (stat.isFile()) {
					zip.addLocalFile(filePath, playlistFolder);
				}
			}

			await fs.ensureDir(zipDir);
			zip.writeZip(zipPath);
		}

		downloadManager.updateDownload(downloadId, {
			status: "completed",
			percent: 100,
			currentAudio: undefined,
			folderPath: outputPath,
			zipPath
		});
	});

	return {
		success: true,
		downloadId
	};
});

