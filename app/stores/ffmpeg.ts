export const useFFmpegStore = defineStore("ffmpeg", {
	state: (): {
		path: string;
		exist: boolean;
		downloading: boolean;
		progress: {
			percent: number;
			speed: number;
		};
	} => ({
		path: "",
		exist: false,
		downloading: false,
		progress: {
			percent: 0,
			speed: 0
		}
	}),

	actions: {
		async check(): Promise<boolean> {
			if (!import.meta.client) {
				return false;
			}

			const isTauri = typeof window !== "undefined" && "__TAURI__" in window;

			if (isTauri) {
				const { join } = await import("@tauri-apps/api/path");
				const { exists } = await import("@tauri-apps/plugin-fs");
				const { appDataDir } = await import("@tauri-apps/api/path");
				const { platform } = await import("@tauri-apps/plugin-os");
				const platformName = platform();

				const appData = await appDataDir();
				const ffmpegDir = await join(appData, "ffmpeg");
				const isWindows = platformName === "windows";
				const ffmpegExe = isWindows ? "ffmpeg.exe" : "ffmpeg";
				const ffmpegPath = await join(ffmpegDir, ffmpegExe);

				this.path = ffmpegPath;
				this.exist = await exists(ffmpegPath);

				if (!this.exist) {
					const { homeDir } = await import("@tauri-apps/api/path");
					const home = await homeDir();
					const oldFFmpegPath = await join(home, ".ffmpeg", ffmpegExe);
					const oldExists = await exists(oldFFmpegPath);

					if (oldExists) {
						this.path = oldFFmpegPath;
						this.exist = true;
					}
				}
			} else {
				const path = await import("path");
				const fs = await import("fs-extra");
				const os = await import("os");

				const homeDir = os.homedir();
				const ffmpegPath = process.env.FFMPEG_BINARY || path.join(homeDir, ".ffmpeg", "ffmpeg");

				this.path = ffmpegPath;
				this.exist = fs.existsSync(ffmpegPath);
			}

			return this.exist;
		},

		async install(): Promise<boolean> {
			if (!import.meta.client) {
				return false;
			}

			this.downloading = true;
			this.progress = { percent: 0, speed: 0 };

			const response = await $fetch<{ success: boolean; path: string; downloadId: string }>("/api/ffmpeg/install", {
				method: "POST",
				body: {}
			}).catch((error) => {
				console.error("Failed to install ffmpeg:", error);
				this.downloading = false;
				this.progress = { percent: 0, speed: 0 };
				return null;
			});

			if (!response || !response.success) {
				this.downloading = false;
				this.progress = { percent: 0, speed: 0 };
				return false;
			}

			const downloadId = response.downloadId;
			const downloadsStore = useDownloadsStore();

			const pollProgress = async (): Promise<void> => {
				await downloadsStore.fetchProgress(downloadId);
				const download = downloadsStore.getDownload(downloadId);

				if (download) {
					this.progress = {
						percent: download.percent,
						speed: download.speed || 0
					};

					if (download.status === "completed") {
						this.downloading = false;
						this.progress = { percent: 100, speed: 0 };
						this.path = response.path;
						await this.check();
					} else if (download.status === "failed") {
						this.downloading = false;
						this.progress = { percent: 0, speed: 0 };
					} else {
						setTimeout(pollProgress, 500);
					}
				} else {
					setTimeout(pollProgress, 500);
				}
			};

			await pollProgress();

			return this.exist;
		}
	}
});
