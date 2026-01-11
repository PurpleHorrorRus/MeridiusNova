import { CacheManager } from "~~/server/utils/cache-manager";

export default defineEventHandler(async (event) => {
	const cacheManager = CacheManager.getInstance();

	if (!await cacheManager.isEnabled()) {
		return {
			enabled: false,
			size: 0,
			tracks: 0,
			maxSize: 0
		};
	}

	const { size, tracks } = await cacheManager.getCacheSize();
	const maxSizeMB = await cacheManager.getMaxSize();
	const maxSize = maxSizeMB * 1024 * 1024;

	return {
		enabled: true,
		size,
		tracks,
		sizeMB: Math.round((size / 1024 / 1024) * 100) / 100,
		maxSize,
		maxSizeMB
	};
});

