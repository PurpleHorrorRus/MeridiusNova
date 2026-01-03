import { CacheManager } from "~~/server/utils/cache-manager";
import { getAudioRequestsInstance, AudioRequests } from "~~/server/api/vk/audio/audio";
import { ERawAudio } from "~~/server/api/vk/audio/types";
import { Parser as M3U8Parser } from "m3u8-parser";
// @ts-ignore - нет типов для node-fetch-retry
import fetch from "node-fetch-retry";

interface FetchResponse {
	ok: boolean;
	status: number;
	statusText: string;
	buffer(): Promise<Buffer>;
	arrayBuffer(): Promise<ArrayBuffer>;
}

const fetchOptions = {
	retry: 10,
	pause: 3000,
	headers: {
		"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:106.0) Gecko/20100101 Firefox/106.0"
	}
};

function normalizeUri(uri: string, root: string): string {
	return !uri.startsWith("http") ? `${root}/${uri}` : uri;
}

async function downloadSegment(segmentUrl: string, segmentName: string, fullId: string, cacheManager: CacheManager, retries: number = 3): Promise<void> {
	for (let attempt = 0; attempt < retries; attempt++) {
		const [error, response] = await fetch(segmentUrl, fetchOptions).then(
			(response: FetchResponse) => [null, response] as const,
			(error: Error) => [error, null] as const
		);

		if (error) {
			const isLastAttempt = attempt === retries - 1;

			if (isLastAttempt) {
				throw error;
			}

			await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
			continue;
		}

		if (!response.ok) {
			const isLastAttempt = attempt === retries - 1;
			if (isLastAttempt) {
				const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
				throw error;
			}
			await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
			continue;
		}

		const [bufferError, segmentData] = await response.buffer().then(
			(data: Buffer) => [null, data] as const,
			(error: Error) => [error, null] as const
		);

		if (bufferError) {
			const isLastAttempt = attempt === retries - 1;
			if (isLastAttempt) {
				throw bufferError;
			}
			await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
			continue;
		}

		if (segmentData.length === 0) {
			const isLastAttempt = attempt === retries - 1;
			if (isLastAttempt) {
				const error = new Error("Empty segment data");
				throw error;
			}
			await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
			continue;
		}

		const [saveError] = await cacheManager.saveSegment(fullId, segmentName, segmentData).then(
			() => [null] as const,
			(error: Error) => [error] as const
		);

		if (saveError) {
			const isLastAttempt = attempt === retries - 1;
			if (isLastAttempt) {
				throw saveError;
			}
			await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
			continue;
		}

		return;
	}
}

async function downloadAndCacheTrack(fullId: string, originalUrl: string, audioRequests: AudioRequests): Promise<void> {
	const cacheManager = CacheManager.getInstance();

	await cacheManager.deleteTrackCache(fullId);

	const [exposeError, exposedUrl] = await audioRequests["exposeSource"](originalUrl).then(
		(url: string) => [null, url] as const,
		(error: Error) => [error, null] as const
	);

	if (exposeError || !exposedUrl) {
		throw new Error(`Failed to expose source URL: ${exposeError?.message || "Unknown error"}`);
	}

	const [m3u8Error, m3u8Response] = await fetch(exposedUrl, fetchOptions).then(
		(response: FetchResponse) => [null, response] as const,
		(error: Error) => [error, null] as const
	);

	if (m3u8Error || !m3u8Response) {
		throw new Error(`Failed to fetch m3u8: ${m3u8Error?.message || "Unknown error"}`);
	}

	if (!m3u8Response.ok) {
		throw new Error(`Failed to fetch m3u8: HTTP ${m3u8Response.status}`);
	}

	const [arrayBufferError, arrayBuffer] = await m3u8Response.arrayBuffer().then(
		(buffer: ArrayBuffer) => [null, buffer] as const,
		(error: Error) => [error, null] as const
	);

	if (arrayBufferError || !arrayBuffer) {
		throw new Error(`Failed to read m3u8 response: ${arrayBufferError?.message || "Unknown error"}`);
	}

	const buffer = Buffer.from(arrayBuffer);
	const firstBytes = buffer.slice(0, 100).toString("utf-8");
	const isM3U8 = firstBytes.trim().startsWith("#EXTM3U") || firstBytes.includes("#EXTM3U");

	if (!isM3U8) {
		throw new Error(`URL ${originalUrl} is not an m3u8 playlist`);
	}

	const m3u8Content = buffer.toString("utf-8");

	await cacheManager.cacheM3U8(fullId, m3u8Content);

	const parser = new M3U8Parser();
	parser.push(m3u8Content);
	parser.end();

	const urlObj = new URL(exposedUrl);
	const root = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname.substring(0, urlObj.pathname.lastIndexOf("/"))}`;

	const uniqueKeys = new Set<string>();
	for (const segment of parser.manifest.segments) {
		if (segment.key && segment.key.uri) {
			const keyUri = normalizeUri(segment.key.uri, root);
			uniqueKeys.add(keyUri);
		}
	}

	for (const keyUri of uniqueKeys) {
		const keyUriFile = keyUri.split("/").pop() || "key.pub";
		const keyName = keyUriFile.match(/(.*?)\?/)?.[1] || keyUriFile;

		const [keyError, keyResponse] = await fetch(keyUri, fetchOptions).then(
			(response: FetchResponse) => [null, response] as const,
			(error: Error) => [error, null] as const
		);

		if (keyError || !keyResponse) {
			throw new Error(`Failed to fetch key ${keyName}: ${keyError?.message || "Unknown error"}`);
		}

		if (!keyResponse.ok) {
			throw new Error(`Failed to fetch key ${keyName}: HTTP ${keyResponse.status}`);
		}

		const [keyBufferError, keyData] = await keyResponse.buffer().then(
			(data: Buffer) => [null, data] as const,
			(error: Error) => [error, null] as const
		);

		if (keyBufferError || !keyData) {
			throw new Error(`Failed to read key ${keyName}: ${keyBufferError?.message || "Unknown error"}`);
		}

		if (keyData.length === 0) {
			throw new Error(`Empty key data for ${keyName}`);
		}

		await cacheManager.saveKey(fullId, keyName, keyData);
	}


	const segmentPromises: Promise<void>[] = [];

	for (const segment of parser.manifest.segments) {
		const segmentUriFile = segment.uri.split("/").pop() || "";
		const segmentName = segmentUriFile.match(/(.*?)\?/)?.[1] || segmentUriFile;
		const segmentUrl = normalizeUri(segment.uri, root);

		segmentPromises.push(
			downloadSegment(segmentUrl, segmentName, fullId, cacheManager)
		);
	}

	await Promise.all(segmentPromises);
}

export default defineEventHandler(async (event) => {
	const cacheManager = CacheManager.getInstance();

	if (!await cacheManager.isEnabled()) {
		throw createError({
			statusCode: 503,
			statusMessage: "Cache is disabled"
		});
	}

	const query = getQuery<{ full_id: string; segment_name: string }>(event);
	const fullId = query.full_id;
	const segmentName = query.segment_name;

	if (!fullId || !segmentName) {
		throw createError({
			statusCode: 400,
			statusMessage: "full_id and segment_name are required"
		});
	}

	const token = getCookie(event, "token");

	if (!token) {
		throw createError({
			statusCode: 401,
			statusMessage: "Unauthorized"
		});
	}

	const isValid = await cacheManager.validateSegment(fullId, segmentName);

	if (!isValid) {

		const m3u8Content = await cacheManager.getM3U8(fullId);

		if (!m3u8Content) {
			throw createError({
				statusCode: 404,
				statusMessage: "Segment not found and m3u8 not available"
			});
		}

		const parser = new M3U8Parser();
		parser.push(m3u8Content);
		parser.end();

		const segment = parser.manifest.segments.find((seg) => {
			const segmentUriFile = seg.uri.split("/").pop() || "";
			const segName = segmentUriFile.match(/(.*?)\?/)?.[1] || segmentUriFile;
			return segName === segmentName;
		});

		if (!segment) {
			throw createError({
				statusCode: 404,
				statusMessage: "Segment not found in m3u8"
			});
		}

		const audioRequests = getAudioRequestsInstance(event);
		const rawAudios = await audioRequests.getById({ ids: fullId });

		if (!rawAudios || rawAudios.length === 0 || !rawAudios[0]) {
			throw createError({
				statusCode: 404,
				statusMessage: "Audio not found"
			});
		}

		const rawAudio = rawAudios[0];
		const encryptedUrl = (rawAudio[ERawAudio.URL] as string).replace("&long_chunk=1", "");

		const [exposeError, exposedUrl] = await audioRequests["exposeSource"](encryptedUrl).then(
			(url: string) => [null, url] as const,
			(error: Error) => [error, null] as const
		);

		if (exposeError || !exposedUrl) {
			throw createError({
				statusCode: 500,
				statusMessage: `Failed to expose source URL: ${exposeError?.message || "Unknown error"}`
			});
		}

		const urlObj = new URL(exposedUrl);
		const root = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname.substring(0, urlObj.pathname.lastIndexOf("/"))}`;
		const segmentUrl = normalizeUri(segment.uri, root);

		const [fetchError, segmentResponse] = await fetch(segmentUrl, fetchOptions).then(
			(response: FetchResponse) => [null, response] as const,
			(error: Error) => [error, null] as const
		);

		if (fetchError || !segmentResponse) {
			throw createError({
				statusCode: 500,
				statusMessage: `Failed to fetch segment: ${fetchError?.message || "Unknown error"}`
			});
		}

		if (!segmentResponse.ok) {
			throw createError({
				statusCode: segmentResponse.status,
				statusMessage: `Failed to fetch segment: HTTP ${segmentResponse.status}`
			});
		}

		const [bufferError, segmentData] = await segmentResponse.buffer().then(
			(data: Buffer) => [null, data] as const,
			(error: Error) => [error, null] as const
		);

		if (bufferError || !segmentData) {
			throw createError({
				statusCode: 500,
				statusMessage: `Failed to read segment: ${bufferError?.message || "Unknown error"}`
			});
		}

		cacheManager.saveSegment(fullId, segmentName, segmentData).catch(() => {
			// Ignore background caching errors
		});

		setHeader(event, "Content-Type", "application/octet-stream");
		setHeader(event, "Cache-Control", "no-store");

		return segmentData;
	}

	const segmentData = await cacheManager.getSegment(fullId, segmentName);

	if (!segmentData) {
		throw createError({
			statusCode: 404,
			statusMessage: "Segment not found"
		});
	}

	setHeader(event, "Content-Type", "application/octet-stream");
	setHeader(event, "Cache-Control", "no-store");

	return segmentData;
});