import { CacheManager } from "~~/server/utils/cache-manager";
import { getAudioRequestsInstance, AudioRequests } from "~~/server/api/vk/audio/audio";
import { ERawAudio } from "~~/server/api/vk/audio/types";
// @ts-ignore - нет типов для m3u8-parser
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
    if (uri.startsWith("http://") || uri.startsWith("https://")) {
        return uri;
    }

    const cleanUri = uri.startsWith("/") ? uri.substring(1) : uri;
    return `${root}/${cleanUri}`;
}

function setM3U8Headers(event: any): void {
    setHeader(event, "Content-Type", "application/vnd.apple.mpegurl");
    setHeader(event, "Cache-Control", "no-cache, no-store, must-revalidate");
    setHeader(event, "Pragma", "no-cache");
    setHeader(event, "Expires", "0");
    setHeader(event, "Access-Control-Allow-Origin", "*");
    setHeader(event, "Access-Control-Allow-Methods", "GET, OPTIONS");
    setHeader(event, "Access-Control-Allow-Headers", "Content-Type");
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

        const [bufferError, segmentData] = await response.arrayBuffer().then(
            (arrayBuffer: ArrayBuffer) => [null, Buffer.from(arrayBuffer)] as const,
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

        const [keyBufferError, keyData] = await keyResponse.arrayBuffer().then(
            (arrayBuffer: ArrayBuffer) => [null, Buffer.from(arrayBuffer)] as const,
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

    const cacheEnabled = await cacheManager.isEnabled();

    if (!cacheEnabled) {
        throw createError({
            status: 503,
            statusText: "Cache is disabled"
        });
    }

    const query = getQuery<{ full_id: string }>(event);
    const fullId = query.full_id;

    if (!fullId) {
        throw createError({
            status: 400,
            statusText: "full_id is required"
        });
    }

    const token = getCookie(event, "token");
    const audioRequests = getAudioRequestsInstance(event);
    const [ownerId, id] = fullId.split("_").map(Number);

    if (isNaN(ownerId) || isNaN(id)) {
        throw createError({
            status: 400,
            statusText: "Invalid full_id format"
        });
    }

    let originalUrl = "";
    let exposedUrl = "";

    if (token) {
        const rawAudios = await audioRequests.getById({ ids: fullId });

        if (rawAudios && rawAudios.length > 0 && rawAudios[0]) {
            const rawAudio = rawAudios[0];
            const encryptedUrl = (rawAudio[ERawAudio.URL] as string).replace("&long_chunk=1", "");

            originalUrl = encryptedUrl;
            const [exposeError, exposed] = await audioRequests["exposeSource"](encryptedUrl).then(
                (url: string) => [null, url] as const,
                (error: Error) => [error, null] as const
            );

            if (!exposeError && exposed) {
                exposedUrl = exposed;
            }
        }
    }

    let m3u8Content = await cacheManager.getM3U8(fullId);

    if (m3u8Content) {
        const isM3U8Valid = m3u8Content.trim().startsWith("#EXTM3U") || m3u8Content.includes("#EXTM3U");

        if (!isM3U8Valid) {
            await cacheManager.deleteTrackCache(fullId);
            m3u8Content = null;
        } else {
            const isTrackValid = await cacheManager.validateTrack(fullId);

            if (!isTrackValid) {
                if (originalUrl) {
                    downloadAndCacheTrack(fullId, originalUrl, audioRequests).catch(() => {
                        // Ignore background caching errors
                    });
                } else {
                    await cacheManager.deleteTrackCache(fullId);
                }

                m3u8Content = null;
            }
        }
    }

    if (!m3u8Content) {
        if (!exposedUrl) {
            if (!originalUrl) {
                throw createError({
                    status: 401,
                    statusText: "Unauthorized - cache not available and no authentication"
                });
            }

            downloadAndCacheTrack(fullId, originalUrl, audioRequests).catch(() => {
                // Ignore background caching errors
            });

            const [exposeError, exposed] = await audioRequests["exposeSource"](originalUrl).then(
                (url: string) => [null, url] as const,
                (error: Error) => [error, null] as const
            );

            if (exposeError || !exposed) {
                throw createError({
                    status: 500,
                    statusText: `Failed to expose source URL: ${exposeError?.message || "Unknown error"}`
                });
            }

            exposedUrl = exposed;
        }

        const [m3u8Error, m3u8Response] = await fetch(exposedUrl, fetchOptions).then(
            (response: FetchResponse) => [null, response] as const,
            (error: Error) => [error, null] as const
        );

        if (m3u8Error || !m3u8Response) {
            throw createError({
                status: 500,
                statusText: `Failed to fetch m3u8: ${m3u8Error?.message || "Unknown error"}`
            });
        }

        if (!m3u8Response.ok) {
            throw createError({
                status: 500,
                statusText: `Failed to fetch m3u8: HTTP ${m3u8Response.status}`
            });
        }

        const [arrayBufferError, arrayBuffer] = await m3u8Response.arrayBuffer().then(
            (buffer: ArrayBuffer) => [null, buffer] as const,
            (error: Error) => [error, null] as const
        );

        if (arrayBufferError || !arrayBuffer) {
            throw createError({
                status: 500,
                statusText: `Failed to read m3u8 response: ${arrayBufferError?.message || "Unknown error"}`
            });
        }

        const m3u8Text = Buffer.from(arrayBuffer).toString("utf-8");

        setM3U8Headers(event);

        return m3u8Text;
    }

    if (!m3u8Content.trim().startsWith("#EXTM3U") && !m3u8Content.includes("#EXTM3U")) {
        await cacheManager.deleteTrackCache(fullId);
        throw createError({
            status: 400,
            statusText: "Cached content is not an m3u8 playlist"
        });
    }

    const parser = new M3U8Parser();
    parser.push(m3u8Content);
    parser.end();

    const baseUrl = getRequestURL(event);
    const protocol = baseUrl.protocol;
    const host = baseUrl.host;

    if (!host) {
        throw createError({
            status: 500,
            statusText: "Unable to determine host"
        });
    }

    let modifiedContent: string = m3u8Content;

    const keyUris = new Set<string>();
    for (const segment of parser.manifest.segments) {
        if (segment.key && segment.key.uri) {
            keyUris.add(segment.key.uri);
        }
    }

    for (const keyUri of keyUris) {
        const keyUriFile = keyUri.split("/").pop() || "key.pub";
        const keyName = keyUriFile.match(/(.*?)\?/)?.[1] || keyUriFile;
        const proxyKeyUrl = `${protocol}//${host}/api/cache/key?full_id=${encodeURIComponent(fullId)}&key_name=${encodeURIComponent(keyName)}&v=${Date.now()}`;

        modifiedContent = modifiedContent.replace(
            new RegExp(`URI=["']${keyUri.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`, "g"),
            `URI="${proxyKeyUrl}"`
        );
    }

    for (const segment of parser.manifest.segments) {
        const segmentUriFile = segment.uri.split("/").pop() || "";
        const segmentName = segmentUriFile.match(/(.*?)\?/)?.[1] || segmentUriFile;
        const proxyUrl = `${protocol}//${host}/api/cache/segment?full_id=${encodeURIComponent(fullId)}&segment_name=${encodeURIComponent(segmentName)}&v=${Date.now()}`;

        modifiedContent = modifiedContent.replace(new RegExp(segment.uri.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), proxyUrl);

        if (segmentUriFile !== segment.uri) {
            modifiedContent = modifiedContent.replace(new RegExp(segmentUriFile.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), proxyUrl);
        }

        if (segmentName !== segmentUriFile) {
            modifiedContent = modifiedContent.replace(new RegExp(`^${segmentName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "gm"), proxyUrl);
        }
    }

    setM3U8Headers(event);

    return modifiedContent;
});