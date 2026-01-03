import { CacheManager } from "~~/server/utils/cache-manager";

export default defineEventHandler(async (event) => {
	const cacheManager = CacheManager.getInstance();

	if (!await cacheManager.isEnabled()) {
		throw createError({
			statusCode: 503,
			statusMessage: "Cache is disabled"
		});
	}

	const query = getQuery<{ full_id: string; key_name: string }>(event);
	const fullId = query.full_id;
	const keyName = query.key_name;

	if (!fullId || !keyName) {
		throw createError({
			statusCode: 400,
			statusMessage: "full_id and key_name are required"
		});
	}

	const keyData = await cacheManager.getKey(fullId, keyName);

	if (!keyData) {
		throw createError({
			statusCode: 404,
			statusMessage: "Key not found"
		});
	}

	setHeader(event, "Content-Type", "application/octet-stream");
	setHeader(event, "Cache-Control", "public, max-age=31536000");
	setHeader(event, "Access-Control-Allow-Origin", "*");
	setHeader(event, "Access-Control-Allow-Methods", "GET, OPTIONS");
	setHeader(event, "Access-Control-Allow-Headers", "Content-Type");

	return keyData;
});

