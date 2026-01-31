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
import { isExternalServer, getDownloadSettings, formatFilename } from "~~/server/utils/download-utils";

import type { TAudio } from "../audio/types";
import type { IPlaylistDownload } from "~~/server/utils/download-manager";
import type { TGetSectionPayload, TGetCatalogSectionPayload, TMore } from "~~/server/utils/types";

export default defineEventHandler(async (event) => {
	const playlistsRequests = getPlaylistsRequestsInstance(event);
	const audioRequests = getAudioRequestsInstance(event);
	const body = await readBody(event);

	if (!body.playlist_id || !body.owner_id) {
		throw createError({
			status: 400,
			message: "playlist_id and owner_id are required"
		});
	}

	const clientType = getHeader(event, "x-client-type") || "browser";
	const isBrowser = clientType === "browser";

	const { downloadPath, template, ffmpegPath, concurrency } = await getDownloadSettings();

	if (!ffmpegPath || !fs.existsSync(ffmpegPath)) {
		throw createError({
			status: 400,
			message: "FFmpeg not installed. Please install FFmpeg first."
		});
	}

	if (!downloadPath) {
		throw createError({
			status: 400,
			message: "Download path not configured. Please set download path in settings."
		});
	}

	const downloadId = downloadManager.generateId();

	let playlist = await playlistsRequests.getPlaylist({
		owner_id: Number(body.owner_id),
		playlist_id: Number(body.playlist_id),
		access_hash: body.access_hash as string | undefined,
		list: true
	});

	if (!playlist) {
		throw createError({
			status: 404,
			message: "Playlist not found"
		});
	}

	// Для библиотеки пользователя (playlist_id === -1) получаем информацию о пользователе
	if (playlist.playlist_id === -1) {
		const { BaseRequest } = await import("~~/server/utils/base");
		const baseRequest = new BaseRequest(event);
		const ownerId = Number(body.owner_id);
		const isUser = ownerId > 0;

		if (isUser) {
			const users = await baseRequest.callVKAPI("users.get", {
				user_ids: Math.abs(ownerId).toString(),
				fields: "photo_200,photo_max"
			}).catch(() => []);

			if (users && Array.isArray(users) && users.length > 0) {
				const user = users[0];
				playlist.title = `${user.first_name || ""} ${user.last_name || ""}`.trim() || `User ${ownerId}`;
				playlist.cover_url = user.photo_200 || user.photo_max || playlist.cover_url;
				playlist.author = {
					id: user.id,
					name: playlist.title
				};
			}
		} else {
			const response = await baseRequest.callVKAPI("groups.getById", {
				group_ids: Math.abs(ownerId).toString(),
				fields: "photo_200"
			}).catch(() => ({ groups: [] }));

			if (response && response.groups && Array.isArray(response.groups) && response.groups.length > 0) {
				const group = response.groups[0];
				playlist.title = group.name || `Group ${ownerId}`;
				playlist.cover_url = group.photo_200 || playlist.cover_url;
				playlist.author = {
					id: -Math.abs(group.id),
					name: playlist.title
				};
			}
		}
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

		// Для библиотеки пользователя (playlist_id === -1) используем другой способ загрузки
		if (playlist.playlist_id === -1) {
			let hasMore = true;

			while (hasMore) {
				let response: { audios: TAudio[]; more: TMore | null } | null = null;

				if (!more) {
					// Первая загрузка
					const section = await audioRequests.getSection<TGetSectionPayload>({
						owner_id: playlist.owner_id,
						section: "all"
					});

					const payloadData = section.payload[1]?.[1] as { playlist?: { list?: any[] } } | undefined;
					const audios = await audioRequests.parseAudios(payloadData?.playlist?.list || [], {
						withUrls: false
					});

					more = audioRequests.parseMore(payloadData || {});

					response = {
						audios,
						more
					};
				} else {
					// Загрузка следующей страницы
					const result = await audioRequests.requestMore<TGetCatalogSectionPayload, TAudio>(more);

					if (result && typeof result === "object" && "list" in result) {
						response = {
							audios: result.list as TAudio[],
							more: result.more || null
						};
					} else {
						hasMore = false;
						break;
					}
				}

				if (!response || !response.audios || response.audios.length === 0) {
					hasMore = false;
					break;
				}

				allAudios = allAudios.concat(response.audios);
				more = response.more;

				if (!more || !more.next_from) {
					hasMore = false;
					break;
				}
			}
		} else {
			// Для обычных плейлистов используем стандартный способ
			let hasMore = true;

			while (hasMore) {
				const response = await playlistsRequests.getPlaylist({
					owner_id: playlist.owner_id,
					playlist_id: playlist.playlist_id,
					access_hash: playlist.access_hash,
					list: true,
					count: 1000,
					offset: allAudios.length
				});

				if (!response || !response.list || response.list.length === 0) {
					hasMore = false;
					break;
				}

				allAudios = allAudios.concat(response.list);
				more = response.more;

				if (!more || !more.next_from) {
					hasMore = false;
					break;
				}
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

