import type { IDownloadProgress, TDownload } from "~~/server/utils/download-manager";

export const useDownloadsStore = defineStore("downloads", {
	state: (): {
		downloads: Map<string, TDownload>;
		pollingInterval: NodeJS.Timeout | null;
		browserDownloaded: Set<string>;
	} => ({
		downloads: new Map(),
		pollingInterval: null,
		browserDownloaded: new Set()
	}),

	actions: {
		async fetchProgress(downloadId?: string): Promise<void> {
			if (!import.meta.client) {
				return;
			}

			const url = downloadId
				? `/api/downloads/progress?downloadId=${downloadId}`
				: "/api/downloads/progress";

			const response = await $fetch<TDownload | TDownload[]>(url).catch(() => null);

			if (!response) {
				return;
			}

			const downloads = Array.isArray(response) ? response : [response];

			downloads.forEach(download => {
				this.downloads.set(download.downloadId, download);
			});

			this.checkAndManagePolling();
		},

		async fetchQueue(): Promise<void> {
			if (!import.meta.client) {
				return;
			}

			const response = await $fetch<{
				queued: TDownload[];
				active: TDownload[];
				all: TDownload[];
			}>("/api/downloads/queue").catch(() => null);

			if (!response) {
				return;
			}

			this.downloads.clear();

			response.all.forEach(download => {
				this.downloads.set(download.downloadId, download);
			});

			this.checkAndManagePolling();
		},

		checkAndManagePolling(): void {
			if (!import.meta.client) {
				return;
			}

			const hasActiveDownloads = Array.from(this.downloads.values()).some(d =>
				d.status === "queued" || d.status === "preparing" || d.status === "downloading" || d.status === "processing"
			);

			if (hasActiveDownloads && !this.pollingInterval) {
				this.startPolling(1000);
			} else if (!hasActiveDownloads && this.pollingInterval) {
				this.stopPolling();
				this.handleBrowserDownloads();
			} else {
				this.handleBrowserDownloads();
			}
		},

		handleBrowserDownloads(): void {
			if (!import.meta.client) {
				return;
			}

			const isTauri = typeof window !== "undefined" && "__TAURI__" in window;

			if (isTauri) {
				return;
			}

			const completedAudioDownloads = Array.from(this.downloads.values()).filter(d =>
				d.status === "completed" && d.type === "audio"
			) as Array<Extract<TDownload, { type: "audio" }>>;

			completedAudioDownloads.forEach(download => {
				if (download.filePath && !this.browserDownloaded.has(download.downloadId)) {
					this.downloadFileInBrowser(download.downloadId, download.audio.title || "audio");
					this.browserDownloaded.add(download.downloadId);
				}
			});

			const completedPlaylistDownloads = Array.from(this.downloads.values()).filter(d =>
				d.status === "completed" && d.type === "playlist"
			) as Array<Extract<TDownload, { type: "playlist" }>>;

			completedPlaylistDownloads.forEach(download => {
				if (download.zipPath && !this.browserDownloaded.has(download.downloadId)) {
					const playlistTitle = download.playlist.title || "playlist";
					this.downloadFileInBrowser(download.downloadId, `${playlistTitle}.zip`);
					this.browserDownloaded.add(download.downloadId);
				}
			});
		},

		async downloadFileInBrowser(downloadId: string, fallbackFilename: string): Promise<void> {
			if (!import.meta.client) {
				return;
			}

			const response = await fetch(`/api/downloads/file?downloadId=${downloadId}`).catch((error: Error) => {
				console.error("Failed to download file in browser:", error);
				return null;
			});

			if (!response || !response.ok) {
				return;
			}

			const contentDisposition = response.headers.get("Content-Disposition");
			let filename = fallbackFilename;

			if (contentDisposition) {
				const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
				if (filenameMatch && filenameMatch[1]) {
					filename = decodeURIComponent(filenameMatch[1].replace(/['"]/g, ""));
				}
			}

			const blob = await response.blob().catch((error: Error) => {
				console.error("Failed to get blob:", error);
				return null;
			});

			if (!blob) {
				return;
			}

			const url = window.URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			const downloadFilename = filename.endsWith(".mp3") || filename.endsWith(".zip")
				? filename
				: `${filename}.mp3`;
			link.download = downloadFilename;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			window.URL.revokeObjectURL(url);
		},

		startPolling(interval: number = 1000): void {
			if (!import.meta.client || this.pollingInterval) {
				return;
			}

			this.pollingInterval = setInterval(() => {
				this.fetchQueue();
			}, interval);
		},

		stopPolling(): void {
			if (this.pollingInterval) {
				clearInterval(this.pollingInterval);
				this.pollingInterval = null;
			}
		},

		getDownload(downloadId: string): TDownload | undefined {
			return this.downloads.get(downloadId);
		},

		getAllDownloads(): TDownload[] {
			return Array.from(this.downloads.values());
		},

		getQueuedDownloads(): TDownload[] {
			return Array.from(this.downloads.values()).filter(downloadItem => downloadItem.status === "queued");
		},

		getActiveDownloads(): TDownload[] {
			return Array.from(this.downloads.values()).filter(d =>
				d.status === "preparing" || d.status === "downloading" || d.status === "processing"
			);
		},

		getCompletedDownloads(): TDownload[] {
			return Array.from(this.downloads.values()).filter(d =>
				d.status === "completed" || d.status === "failed"
			);
		},

		clearQueueLocal(): void {
			const queued = this.getQueuedDownloads();
			queued.forEach(download => {
				this.downloads.delete(download.downloadId);
			});
			this.checkAndManagePolling();
		},

		clearCompletedLocal(): void {
			const completed = this.getCompletedDownloads();
			completed.forEach(download => {
				this.downloads.delete(download.downloadId);
			});
		},

		clearAllLocal(): void {
			this.downloads.clear();
			this.stopPolling();
		}
	}
});

