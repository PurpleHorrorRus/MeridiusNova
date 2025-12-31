import { downloadManager } from "~~/server/utils/download-manager";

export default defineEventHandler(async (event) => {
	const body = await readBody(event).catch(() => ({}));
	const type = body.type as "queue" | "completed" | "all" | undefined;

	if (type === "queue") {
		downloadManager.clearQueue();
	} else if (type === "completed") {
		downloadManager.clearCompleted();
	} else if (type === "all") {
		downloadManager.clearAll();
	} else {
		downloadManager.clearQueue();
	}

	return {
		success: true
	};
});



