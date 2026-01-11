import { CacheManager } from "~~/server/utils/cache-manager";

export default defineEventHandler(async (event) => {
	const cacheManager = CacheManager.getInstance();

	if (!await cacheManager.isEnabled()) {
		throw createError({
			statusCode: 503,
			statusMessage: "Cache is disabled"
		});
	}

	await cacheManager.clearCache();

	return {
		success: true
	};
});

