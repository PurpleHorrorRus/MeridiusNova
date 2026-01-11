import fs from "fs-extra";
import path from "path";

import { downloadManager } from "~~/server/utils/download-manager";

export default defineEventHandler(async (event) => {
	const query = getQuery(event);
	const downloadId = query.downloadId as string | undefined;

	if (!downloadId) {
		throw createError({
			statusCode: 400,
			message: "downloadId is required"
		});
	}

	const download = downloadManager.getDownload(downloadId);

	if (!download) {
		throw createError({
			statusCode: 404,
			message: "Download not found"
		});
	}

	if (download.status !== "completed") {
		throw createError({
			statusCode: 400,
			message: "Download is not completed"
		});
	}

	let filePath: string | null = null;
	let filename: string | null = null;
	let contentType: string = "application/octet-stream";

	if (download.type === "audio" && download.filePath) {
		filePath = download.filePath;
		const audio = download.audio;
		const performer = audio.performer || audio.artist || "";
		const title = audio.title || "audio";
		filename = performer ? `${performer} - ${title}.mp3` : `${title}.mp3`;
		contentType = "audio/mpeg";
	} else if (download.type === "playlist" && download.zipPath) {
		filePath = download.zipPath;
		const playlist = download.playlist;
		const playlistTitle = playlist.title || "playlist";
		filename = `${playlistTitle}.zip`;
		contentType = "application/zip";
	} else {
		throw createError({
			statusCode: 400,
			message: "Download type not supported for browser download"
		});
	}

	if (!filePath || !fs.existsSync(filePath)) {
		throw createError({
			statusCode: 404,
			message: "File not found"
		});
	}

	const fileBuffer = await fs.readFile(filePath);
	const fileStat = await fs.stat(filePath);

	setHeader(event, "Content-Type", contentType);
	setHeader(event, "Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);
	setHeader(event, "Content-Length", String(fileStat.size));

	return fileBuffer;
});

