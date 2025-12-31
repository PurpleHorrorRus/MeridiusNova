import type { TAudio } from "../api/vk/audio/types";
import type { TPlaylist } from "../utils/types";

export type TDownloadType = "audio" | "playlist" | "ffmpeg";

export type TDownloadStatus = "queued" | "preparing" | "downloading" | "processing" | "completed" | "failed";

export interface IDownloadProgress {
	downloadId: string;
	type: TDownloadType;
	status: TDownloadStatus;
	percent: number;
	speed?: number;
	current?: number;
	total?: number;
	error?: string;
}

export interface IAudioDownload extends IDownloadProgress {
	type: "audio";
	audio: TAudio;
	outputPath: string;
	filePath?: string;
}

export interface IPlaylistDownload extends IDownloadProgress {
	type: "playlist";
	playlist: TPlaylist;
	downloaded: number;
	total: number;
	currentAudio?: TAudio;
	folderPath?: string;
}

export interface IFFmpegDownload extends IDownloadProgress {
	type: "ffmpeg";
}

export type TDownload = IAudioDownload | IPlaylistDownload | IFFmpegDownload;

class DownloadManager {
	private downloads: Map<string, TDownload> = new Map();
	private listeners: Map<string, Set<(progress: IDownloadProgress) => void>> = new Map();

	public addDownload(download: TDownload): void {
		this.downloads.set(download.downloadId, download);
		this.notifyListeners(download.downloadId, download);
	}

	public getDownload(downloadId: string): TDownload | undefined {
		return this.downloads.get(downloadId);
	}

	public updateDownload(downloadId: string, updates: Partial<TDownload>): void {
		const download = this.downloads.get(downloadId);

		if (!download) {
			return;
		}

		const updated = { ...download, ...updates };
		this.downloads.set(downloadId, updated);
		this.notifyListeners(downloadId, updated);
	}

	public removeDownload(downloadId: string): void {
		this.downloads.delete(downloadId);
		this.listeners.delete(downloadId);
	}

	public getAllDownloads(): TDownload[] {
		return Array.from(this.downloads.values());
	}

	public getQueuedDownloads(): TDownload[] {
		return Array.from(this.downloads.values()).filter(d => d.status === "queued");
	}

	public getActiveDownloads(): TDownload[] {
		return Array.from(this.downloads.values()).filter(d =>
			d.status === "preparing" || d.status === "downloading" || d.status === "processing"
		);
	}

	public clearQueue(): void {
		const queued = this.getQueuedDownloads();
		queued.forEach(download => {
			this.removeDownload(download.downloadId);
		});
	}

	public clearCompleted(): void {
		const completed = Array.from(this.downloads.values()).filter(d => d.status === "completed" || d.status === "failed");
		completed.forEach(download => {
			this.removeDownload(download.downloadId);
		});
	}

	public clearAll(): void {
		this.downloads.clear();
		this.listeners.clear();
	}

	public subscribe(downloadId: string, callback: (progress: IDownloadProgress) => void): () => void {
		if (!this.listeners.has(downloadId)) {
			this.listeners.set(downloadId, new Set());
		}

		this.listeners.get(downloadId)!.add(callback);

		return () => {
			const listeners = this.listeners.get(downloadId);
			if (listeners) {
				listeners.delete(callback);
				if (listeners.size === 0) {
					this.listeners.delete(downloadId);
				}
			}
		};
	}

	private notifyListeners(downloadId: string, progress: IDownloadProgress): void {
		const listeners = this.listeners.get(downloadId);
		if (listeners) {
			listeners.forEach(callback => {
				callback(progress);
			});
		}
	}

	public generateId(): string {
		return `download_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
	}
}

export const downloadManager = new DownloadManager();

