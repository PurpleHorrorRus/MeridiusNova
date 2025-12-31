import { downloadManager } from "~~/server/utils/download-manager";

export default defineEventHandler(async (event) => {
	const queued = downloadManager.getQueuedDownloads();
	const active = downloadManager.getActiveDownloads();

	return {
		queued,
		active,
		all: downloadManager.getAllDownloads()
	};
});

