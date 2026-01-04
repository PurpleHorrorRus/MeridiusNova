import fs from "fs-extra";
import path from "node:path";
import os from "node:os";
// @ts-ignore - нет типов для m3u8-parser
import { Parser as M3U8Parser } from "m3u8-parser";
import type { TSettings } from "./types";

const SETTINGS_DIR = path.resolve(os.homedir(), ".meridius");
const SETTINGS_FILE = path.resolve(SETTINGS_DIR, "settings.json");

interface AccessMetadata {
	lastAccess: number;
	size: number;
}

interface SegmentInfo {
	name: string;
	url: string;
	method: string;
	keyUri?: string;
}

async function getSettings(): Promise<Partial<TSettings> | null> {
	if (!fs.pathExistsSync(SETTINGS_FILE)) {
		return null;
	}

	const [error, settings] = await fs.readJson(SETTINGS_FILE).then(
		(data) => [null, data] as const,
		(error) => [error, null] as const
	);

	if (error) {
		return null;
	}

	return settings as Partial<TSettings>;
}

function getDefaultCachePath(): string {
	return path.resolve(os.homedir(), ".meridius", "cache");
}

function isExternalServer(): boolean {
	return process.env.EXTERNAL_SERVER === "true" || process.env.EXTERNAL_SERVER === "1";
}

async function getCacheBasePath(): Promise<string> {
	if (isExternalServer()) {
		return getDefaultCachePath();
	}

	const settings = await getSettings();
	const cachePath = settings?.cache?.path;

	if (cachePath && cachePath.trim() !== "") {
		return path.resolve(cachePath);
	}

	return getDefaultCachePath();
}

function getTrackCachePath(basePath: string, fullId: string): string {
	return path.resolve(basePath, fullId);
}

function getSegmentsPath(trackPath: string): string {
	return path.resolve(trackPath, "segments");
}

function getKeysPath(trackPath: string): string {
	return path.resolve(trackPath, "keys");
}

function getMetadataPath(trackPath: string): string {
	return path.resolve(trackPath, "metadata.json");
}

function getAccessPath(trackPath: string): string {
	return path.resolve(trackPath, "access.json");
}

function getM3U8Path(trackPath: string): string {
	return path.resolve(trackPath, "m3u8.txt");
}

async function ensureCacheDir(cachePath: string): Promise<void> {
	if (!fs.pathExistsSync(cachePath)) {
		const [error] = await fs.mkdirp(cachePath).then(
			() => [null] as const,
			(error) => [error] as const
		);

		if (error) {
			throw error;
		}
	}
}

async function ensureTrackDir(trackPath: string): Promise<void> {
	await ensureCacheDir(trackPath);
	await ensureCacheDir(getSegmentsPath(trackPath));
	await ensureCacheDir(getKeysPath(trackPath));
}

export class CacheManager {
	private static instance: CacheManager | null = null;

	private constructor() { }

	public static getInstance(): CacheManager {
		if (!CacheManager.instance) {
			CacheManager.instance = new CacheManager();
		}

		return CacheManager.instance;
	}

	public async isEnabled(): Promise<boolean> {
		const settings = await getSettings();
		return settings?.cache?.enable === true;
	}

	public async getMaxSize(): Promise<number> {
		const settings = await getSettings();
		return settings?.cache?.maxSize || 1024;
	}

	public async getCachePath(fullId: string): Promise<string> {
		const basePath = await getCacheBasePath();
		await ensureCacheDir(basePath);
		return getTrackCachePath(basePath, fullId);
	}

	public async getMetadata(fullId: string): Promise<Record<string, unknown> | null> {
		const trackPath = await this.getCachePath(fullId);
		const metadataPath = getMetadataPath(trackPath);

		if (!fs.pathExistsSync(metadataPath)) {
			return null;
		}

		const [error, metadata] = await fs.readJson(metadataPath).then(
			(data: unknown) => [null, data] as const,
			(error: Error) => [error, null] as const
		);

		if (error) {
			return null;
		}

		return metadata as Record<string, unknown>;
	}

	public async saveMetadata(fullId: string, metadata: Record<string, unknown>): Promise<void> {
		const trackPath = await this.getCachePath(fullId);
		await ensureTrackDir(trackPath);

		const metadataPath = getMetadataPath(trackPath);
		const [error] = await fs.writeJson(metadataPath, metadata, { spaces: 4 }).then(
			() => [null] as const,
			(error) => [error] as const
		);

		if (error) {
			throw error;
		}
	}

	public async hasSegment(fullId: string, segmentName: string): Promise<boolean> {
		const trackPath = await this.getCachePath(fullId);
		const segmentPath = path.resolve(getSegmentsPath(trackPath), segmentName);

		return fs.pathExistsSync(segmentPath);
	}

	public async validateSegment(fullId: string, segmentName: string): Promise<boolean> {
		const trackPath = await this.getCachePath(fullId);
		const segmentPath = path.resolve(getSegmentsPath(trackPath), segmentName);

		if (!fs.pathExistsSync(segmentPath)) {
			return false;
		}

		const [error, stats] = await fs.stat(segmentPath).then(
			(stats) => [null, stats] as const,
			(error) => [error, null] as const
		);

		if (error || !stats) {
			return false;
		}

		return stats.size > 0;
	}

	public async getSegment(fullId: string, segmentName: string): Promise<Buffer | null> {
		const trackPath = await this.getCachePath(fullId);
		const segmentPath = path.resolve(getSegmentsPath(trackPath), segmentName);

		if (!fs.pathExistsSync(segmentPath)) {
			return null;
		}

		const [error, data] = await fs.readFile(segmentPath).then(
			(data) => [null, data] as const,
			(error) => [error, null] as const
		);

		if (error) {
			return null;
		}

		return data;
	}

	public async saveSegment(fullId: string, segmentName: string, data: Buffer): Promise<void> {
		const trackPath = await this.getCachePath(fullId);
		await ensureTrackDir(trackPath);

		const segmentPath = path.resolve(getSegmentsPath(trackPath), segmentName);

		const [error] = await fs.writeFile(segmentPath, data).then(
			() => [null] as const,
			(error) => [error] as const
		);

		if (error) {
			throw error;
		}
		await this.updateAccess(fullId);
	}

	public async hasKey(fullId: string, keyName: string): Promise<boolean> {
		const trackPath = await this.getCachePath(fullId);
		const keyPath = path.resolve(getKeysPath(trackPath), keyName);

		return fs.pathExistsSync(keyPath);
	}

	public async getKey(fullId: string, keyName: string): Promise<Buffer | null> {
		const trackPath = await this.getCachePath(fullId);
		const keyPath = path.resolve(getKeysPath(trackPath), keyName);

		if (!fs.pathExistsSync(keyPath)) {
			return null;
		}

		const [error, data] = await fs.readFile(keyPath).then(
			(data) => [null, data] as const,
			(error) => [error, null] as const
		);

		if (error) {
			return null;
		}

		return data;
	}

	public async saveKey(fullId: string, keyName: string, data: Buffer): Promise<void> {
		const trackPath = await this.getCachePath(fullId);
		await ensureTrackDir(trackPath);

		const keyPath = path.resolve(getKeysPath(trackPath), keyName);
		const [error] = await fs.writeFile(keyPath, data).then(
			() => [null] as const,
			(error) => [error] as const
		);

		if (error) {
			throw error;
		}
	}

	public async cacheM3U8(fullId: string, m3u8Content: string): Promise<void> {
		const trackPath = await this.getCachePath(fullId);
		await ensureTrackDir(trackPath);

		const m3u8Path = getM3U8Path(trackPath);

		const [error] = await fs.writeFile(m3u8Path, m3u8Content, "utf-8").then(
			() => [null] as const,
			(error) => [error] as const
		);

		if (error) {
			throw error;
		}
	}

	public async getM3U8(fullId: string): Promise<string | null> {
		const trackPath = await this.getCachePath(fullId);
		const m3u8Path = getM3U8Path(trackPath);

		if (!fs.pathExistsSync(m3u8Path)) {
			return null;
		}

		const [error, content] = await fs.readFile(m3u8Path, "utf-8").then(
			(data) => [null, data] as const,
			(error) => [error, null] as const
		);

		if (error) {
			return null;
		}

		return content;
	}

	public async getAllSegments(fullId: string): Promise<SegmentInfo[]> {
		const m3u8Content = await this.getM3U8(fullId);

		if (!m3u8Content) {
			return [];
		}

		const parser = new M3U8Parser();
		parser.push(m3u8Content);
		parser.end();

		const segments: SegmentInfo[] = [];

		for (const segment of parser.manifest.segments) {
			const segmentUriFile = segment.uri.split("/").pop() || "";
			const file = segmentUriFile.match(/(.*?)\?/)?.[1] || segmentUriFile;

			segments.push({
				name: file,
				url: segment.uri,
				method: segment.key ? segment.key.method : "NONE",
				keyUri: segment.key ? segment.key.uri : undefined
			});
		}

		return segments;
	}

	public async validateTrack(fullId: string): Promise<boolean> {
		const segments = await this.getAllSegments(fullId);

		if (segments.length === 0) {
			return false;
		}

		for (const segment of segments) {
			const isValid = await this.validateSegment(fullId, segment.name);

			if (!isValid) {
				return false;
			}
		}

		return true;
	}

	public async deleteTrackCache(fullId: string): Promise<void> {
		const trackPath = await this.getCachePath(fullId);

		if (fs.pathExistsSync(trackPath)) {
			const [error] = await fs.remove(trackPath).then(
				() => [null] as const,
				(error) => [error] as const
			);

			if (error) {
				throw error;
			}
		}
	}

	private async updateAccess(fullId: string): Promise<void> {
		const trackPath = await this.getCachePath(fullId);
		const accessPath = getAccessPath(trackPath);

		const size = await this.calculateTrackSize(trackPath);
		const accessData: AccessMetadata = {
			lastAccess: Date.now(),
			size
		};

		const [error] = await fs.writeJson(accessPath, accessData, { spaces: 4 }).then(
			() => [null] as const,
			(error) => [error] as const
		);

		if (error) {
			// Ignore access update errors
		}
	}

	private async calculateTrackSize(trackPath: string): Promise<number> {
		if (!fs.pathExistsSync(trackPath)) {
			return 0;
		}

		const [error, files] = await fs.readdir(trackPath, { recursive: true }).then(
			(files) => [null, files] as const,
			(error) => [error, null] as const
		);

		if (error || !files) {
			return 0;
		}

		let totalSize = 0;

		for (const file of files) {
			const filePath = path.resolve(trackPath, file as string);

			if (fs.statSync(filePath).isFile()) {
				totalSize += fs.statSync(filePath).size;
			}
		}

		return totalSize;
	}

	public async getCacheSize(): Promise<{ size: number; tracks: number }> {
		const basePath = await getCacheBasePath();

		if (!fs.pathExistsSync(basePath)) {
			return { size: 0, tracks: 0 };
		}

		const [error, entries] = await fs.readdir(basePath).then(
			(entries) => [null, entries] as const,
			(error) => [error, null] as const
		);

		if (error || !entries) {
			return { size: 0, tracks: 0 };
		}

		let totalSize = 0;
		let trackCount = 0;

		for (const entry of entries) {
			const entryPath = path.resolve(basePath, entry);
			const [statError, stats] = await fs.stat(entryPath).then(
				(stats) => [null, stats] as const,
				(error) => [error, null] as const
			);

			if (statError || !stats) {
				continue;
			}

			if (stats.isDirectory()) {
				const m3u8Path = getM3U8Path(entryPath);

				if (fs.pathExistsSync(m3u8Path)) {
					trackCount++;
					totalSize += await this.calculateTrackSize(entryPath);
				}
			}
		}

		return { size: totalSize, tracks: trackCount };
	}

	public async cleanupCache(maxSizeMB: number): Promise<void> {
		const basePath = await getCacheBasePath();

		if (!fs.pathExistsSync(basePath)) {
			return;
		}

		const maxSizeBytes = maxSizeMB * 1024 * 1024;
		const [error, entries] = await fs.readdir(basePath).then(
			(entries) => [null, entries] as const,
			(error) => [error, null] as const
		);

		if (error || !entries) {
			throw error || new Error("Failed to read cache directory");
		}

		const tracks: Array<{ fullId: string; lastAccess: number; size: number }> = [];

		for (const entry of entries) {
			const entryPath = path.resolve(basePath, entry);
			const [statError, stats] = await fs.stat(entryPath).then(
				(stats) => [null, stats] as const,
				(error) => [error, null] as const
			);

			if (statError || !stats || !stats.isDirectory()) {
				continue;
			}

			const accessPath = getAccessPath(entryPath);
			let lastAccess = 0;
			let size = 0;

			if (fs.pathExistsSync(accessPath)) {
				const [readError, accessData] = await fs.readJson(accessPath).then(
					(data) => [null, data] as const,
					(error) => [error, null] as const
				);

				if (!readError && accessData) {
					lastAccess = (accessData as AccessMetadata).lastAccess || 0;
					size = (accessData as AccessMetadata).size || 0;
				} else {
					size = await this.calculateTrackSize(entryPath);
					lastAccess = stats.mtimeMs;
				}
			} else {
				size = await this.calculateTrackSize(entryPath);
				lastAccess = stats.mtimeMs;
			}

			tracks.push({
				fullId: entry,
				lastAccess,
				size
			});
		}

		tracks.sort((a, b) => a.lastAccess - b.lastAccess);

		let currentSize = tracks.reduce((sum, track) => sum + track.size, 0);

		for (const track of tracks) {
			if (currentSize <= maxSizeBytes) {
				break;
			}

			await this.deleteTrackCache(track.fullId);
			currentSize -= track.size;
		}
	}

	public async clearCache(): Promise<void> {
		const basePath = await getCacheBasePath();

		if (fs.pathExistsSync(basePath)) {
			const [removeError] = await fs.remove(basePath).then(
				() => [null] as const,
				(error) => [error] as const
			);

			if (removeError) {
				throw removeError;
			}

			await ensureCacheDir(basePath);
		}
	}

	private getPlaylistCachePath(ownerId: number, playlistId: number): string {
		const basePath = path.resolve(os.homedir(), ".meridius", "playlist-cache");
		return path.resolve(basePath, `${ownerId}_${playlistId}.json`);
	}

	public async getPlaylistCache(ownerId: number, playlistId: number): Promise<Record<string, unknown> | null> {
		const cachePath = this.getPlaylistCachePath(ownerId, playlistId);

		if (!fs.pathExistsSync(cachePath)) {
			return null;
		}

		const [error, data] = await fs.readJson(cachePath).then(
			(data: unknown) => [null, data] as const,
			(error: Error) => [error, null] as const
		);

		if (error) {
			return null;
		}

		return data as Record<string, unknown>;
	}

	public async savePlaylistCache(ownerId: number, playlistId: number, playlistData: Record<string, unknown>): Promise<void> {
		const cachePath = this.getPlaylistCachePath(ownerId, playlistId);
		const cacheDir = path.dirname(cachePath);

		await ensureCacheDir(cacheDir);

		const [error] = await fs.writeJson(cachePath, playlistData, { spaces: 4 }).then(
			() => [null] as const,
			(error) => [error, null] as const
		);

		if (error) {
			throw error;
		}
	}

	private getAlbumCachePath(ownerId: number, playlistId: number): string {
		const basePath = path.resolve(os.homedir(), ".meridius", "album-cache");
		return path.resolve(basePath, `${ownerId}_${playlistId}.json`);
	}

	public async getAlbumCache(ownerId: number, playlistId: number): Promise<{
		owner_id: number;
		id: number;
		title: string;
		thumb?: {
			photo_300?: string;
			photo_600?: string;
			photo_1200?: string;
		};
	} | null> {
		const cachePath = this.getAlbumCachePath(ownerId, playlistId);

		if (!fs.pathExistsSync(cachePath)) {
			return null;
		}

		const [error, data] = await fs.readJson(cachePath).then(
			(data: unknown) => [null, data] as const,
			(error: Error) => [error, null] as const
		);

		if (error) {
			return null;
		}

		return data as {
			owner_id: number;
			id: number;
			title: string;
			thumb?: {
				photo_300?: string;
				photo_600?: string;
				photo_1200?: string;
			};
		};
	}

	public async saveAlbumCache(ownerId: number, playlistId: number, albumData: {
		owner_id: number;
		id: number;
		title: string;
		thumb?: {
			photo_300?: string;
			photo_600?: string;
			photo_1200?: string;
		};
	}): Promise<void> {
		const cachePath = this.getAlbumCachePath(ownerId, playlistId);
		const cacheDir = path.dirname(cachePath);

		await ensureCacheDir(cacheDir);

		const [error] = await fs.writeJson(cachePath, albumData, { spaces: 4 }).then(
			() => [null] as const,
			(error) => [error, null] as const
		);

		if (error) {
			throw error;
		}
	}
}