import { downloadManager } from "~~/server/utils/download-manager";

export default defineEventHandler(async (event) => {
	const query = getQuery(event);
	const downloadId = query.downloadId as string | undefined;

	if (downloadId) {
		const download = downloadManager.getDownload(downloadId);
		return download || null;
	}

	return downloadManager.getAllDownloads();
});

