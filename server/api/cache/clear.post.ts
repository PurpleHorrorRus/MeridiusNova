import { CacheManager } from "~~/server/utils/cache-manager";

export default defineEventHandler(async (event) => {
	const cacheManager = CacheManager.getInstance();

	if (!await cacheManager.isEnabled()) {
		throw createError({
			status: 503,
			statusText: "Cache is disabled"
		});
	}

	await cacheManager.clearCache();

	return {
		success: true
	};
});

