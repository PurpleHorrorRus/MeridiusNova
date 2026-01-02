export const refreshDownloadsQueue = async (): Promise<void> => {
	if (import.meta.client) {
		const { useDownloadsStore } = await import("~/stores/downloads");
		const downloadsStore = useDownloadsStore();
		await downloadsStore.fetchQueue();
	}
};

