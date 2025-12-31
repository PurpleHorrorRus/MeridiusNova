import { downloadManager } from "~~/server/utils/download-manager";
import path from "path";
import fs from "fs-extra";

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

	if (download.type === "audio" && download.filePath) {
		filePath = download.filePath;
	} else if (download.type === "playlist" && download.folderPath) {
		filePath = download.folderPath;
	}

	if (!filePath || !fs.existsSync(filePath)) {
		throw createError({
			statusCode: 404,
			message: "File or folder not found"
		});
	}

	return {
		path: filePath,
		type: download.type === "audio" ? "file" : "folder"
	};
});



