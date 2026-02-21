// @ts-ignore - нет типов для node-fetch-retry
import fetch from "node-fetch-retry";
// @ts-ignore - нет типов для m3u8-parser
import { Parser as M3U8Parser } from "m3u8-parser";

import { getAudioRequestsInstance } from "./audio";
import { CacheManager } from "~~/server/utils/cache-manager";

const fetchOptions = {
	retry: 10,
	pause: 3000,
	headers: {
		"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:106.0) Gecko/20100101 Firefox/106.0"
	}
};

function normalizeUri(uri: string, root: string): string {
	if (uri.startsWith("http://") || uri.startsWith("https://")) {
		return uri;
	}

	const cleanUri = uri.startsWith("/") ? uri.substring(1) : uri;
	return `${root}/${cleanUri}`;
}

async function downloadAndCacheTrack(fullId: string, exposedUrl: string): Promise<void> {
	const cacheManager = CacheManager.getInstance();

	await cacheManager.deleteTrackCache(fullId);

	const m3u8Response = await fetch(exposedUrl, fetchOptions);
	const arrayBuffer = await m3u8Response.arrayBuffer();
	const buffer = Buffer.from(arrayBuffer);
	const firstBytes = buffer.slice(0, 100).toString("utf-8");

	const isM3U8 = firstBytes.trim().startsWith("#EXTM3U") || firstBytes.includes("#EXTM3U");

	if (!isM3U8) {
		throw new Error(`URL ${exposedUrl} is not an m3u8 playlist`);
	}

	const m3u8Content = buffer.toString("utf-8");

	await cacheManager.cacheM3U8(fullId, m3u8Content);

	const parser = new M3U8Parser();
	parser.push(m3u8Content);
	parser.end();

	const urlObj = new URL(exposedUrl);
	const root = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname.substring(0, urlObj.pathname.lastIndexOf("/"))}`;
	const keys: Map<string, Buffer> = new Map();

	for (const segment of parser.manifest.segments) {
		if (segment.key && segment.key.uri) {
			const keyUri = normalizeUri(segment.key.uri, root);
			const keyUriFile = keyUri.split("/").pop() || "key.pub";
			const keyName = keyUriFile.match(/(.*?)\?/)?.[1] || keyUriFile;

			if (!keys.has(keyUri)) {
				const keyResponse = await fetch(keyUri, fetchOptions);
				const keyData = Buffer.from(await keyResponse.arrayBuffer());
				keys.set(keyUri, keyData);
				await cacheManager.saveKey(fullId, keyName, keyData);
			}
		}

		const segmentUriFile = segment.uri.split("/").pop() || "";
		const segmentName = segmentUriFile.match(/(.*?)\?/)?.[1] || segmentUriFile;
		const segmentUrl = normalizeUri(segment.uri, root);

		const segmentResponse = await fetch(segmentUrl, fetchOptions);
		const segmentData = Buffer.from(await segmentResponse.arrayBuffer());

		await cacheManager.saveSegment(fullId, segmentName, segmentData);
	}
}

function startBackgroundCaching(fullId: string, exposedUrl: string): void {
	downloadAndCacheTrack(fullId, exposedUrl).catch(() => {
		// Ignore background caching errors
	});
}

export const getAudioUrls = async (event: any, fullIds: string[], useCache: boolean = true): Promise<Record<string, string>> => {
	if (!fullIds || fullIds.length === 0) {
		throw createError({
			status: 400,
			statusText: "Parameter 'fullIds' is required"
		});
	}

	const cacheManager = CacheManager.getInstance();
	const cacheEnabled = await cacheManager.isEnabled();
	const baseUrl = getRequestURL(event);

	const result: Record<string, string> = {};
	const idsToFetch: string[] = [];

	// Проверяем кэш для каждого ID (только если useCache = true)
	for (const fullId of fullIds) {
		if (useCache && cacheEnabled) {
			const cachedM3U8 = await cacheManager.getM3U8(fullId);
			const isM3U8Cached = cachedM3U8 !== null && cachedM3U8.trim().startsWith("#EXTM3U");

			if (isM3U8Cached) {
				const isTrackValid = await cacheManager.validateTrack(fullId);

				if (isTrackValid) {
					const timestamp = Date.now();
					result[fullId] = `${baseUrl.protocol}//${baseUrl.host}/api/cache/m3u8?full_id=${encodeURIComponent(fullId)}&t=${timestamp}`;
					continue;
				}
			}
		}

		idsToFetch.push(fullId);
	}

	// Если все ID найдены в кэше, возвращаем результат
	if (idsToFetch.length === 0) {
		return result;
	}

	// Получаем URL для ID, которых нет в кэше
	const audioRequests = getAudioRequestsInstance(event);
	const rawAudios = await audioRequests.getById({ ids: idsToFetch.join(",") });

	if (!rawAudios || rawAudios.length === 0) {
		return result;
	}

	// Парсим аудио с полученными URL
	const audios = await audioRequests.parseAudios(rawAudios, {
		raw: false
	});

	for (const audio of audios) {
		if (!audio.url) {
			continue;
		}

		const urlLower = audio.url.toLowerCase();
		const isM3U8Url = urlLower.includes("/index.m3u8") ||
			urlLower.includes(".m3u8") ||
			urlLower.includes("m3u8");

		if (isM3U8Url && cacheEnabled && useCache) {
			const cachedM3U8 = await cacheManager.getM3U8(audio.full_id);
			const isM3U8Cached = cachedM3U8 !== null && cachedM3U8.trim().startsWith("#EXTM3U");

			if (isM3U8Cached) {
				const isTrackValid = await cacheManager.validateTrack(audio.full_id);

				if (isTrackValid) {
					const timestamp = Date.now();
					result[audio.full_id] = `${getRequestURL(event).protocol}//${getRequestURL(event).host}/api/cache/m3u8?full_id=${encodeURIComponent(audio.full_id)}&t=${timestamp}`;
					continue;
				}
			}

			const exposedUrl = audio.url.replace("&long_chunk=1", "");
			startBackgroundCaching(audio.full_id, exposedUrl);
		}

		result[audio.full_id] = audio.url;
	}

	return result;
};

export default defineEventHandler(async (event) => {
	const token = getCookie(event, "token");

	if (!token) {
		throw createError({
			status: 401,
			statusText: "Unauthorized - authentication required. Please ensure cookies are being sent with the request."
		});
	}

	const query = getQuery<{ ids: string }>(event);

	if (!query.ids) {
		throw createError({
			status: 400,
			statusText: "Parameter 'ids' is required"
		});
	}

	const ids = query.ids.split(",").map(id => id.trim());
	return await getAudioUrls(event, ids);
});