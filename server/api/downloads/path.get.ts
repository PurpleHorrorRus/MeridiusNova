import { downloadManager } from "~~/server/utils/download-manager";
import path from "path";
import fs from "fs-extra";
import os from "os";

const isExternalServer = (): boolean => {
	return process.env.EXTERNAL_SERVER === "true" || process.env.EXTERNAL_SERVER === "1";
};

export default defineEventHandler(async (event) => {
	const query = getQuery(event);
	const downloadId = query.downloadId as string | undefined;

	if (!downloadId) {
		throw createError({
			status: 400,
			message: "downloadId is required"
		});
	}

	const download = downloadManager.getDownload(downloadId);

	if (!download) {
		throw createError({
			status: 404,
			message: "Download not found"
		});
	}

	if (download.status !== "completed") {
		throw createError({
			status: 400,
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
			status: 404,
			message: "File or folder not found"
		});
	}

	const isInTmp = filePath.startsWith(os.tmpdir());

	if (isExternalServer() && isInTmp) {
		return {
			path: filePath,
			type: download.type === "audio" ? "file" : "folder",
			requiresDownload: true
		};
	}

	return {
		path: filePath,
		type: download.type === "audio" ? "file" : "folder"
	};
});



