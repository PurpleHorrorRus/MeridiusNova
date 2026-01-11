import { isTauri } from "~/utils/tauri";

import { authenticatedFetch } from "~/utils/api";

import type { TAudio } from "~~/server/api/vk/audio/types";

interface StreamerPaths {
	performer: string;
	title: string;
	song: string;
	url: string;
	cover: string;
}

export const useStreamerStore = defineStore("streamer", {
	state: (): {
		paths: StreamerPaths | null;
		rootPath: string | null;
		initialized: boolean;
	} => ({
		paths: null,
		rootPath: null,
		initialized: false
	}),

	actions: {
		async init(): Promise<boolean> {
			if (!import.meta.client) {
				return false;
			}

			const config = useRuntimeConfig();
			const isExternalServer = process.env.EXTERNAL_SERVER === "true"
				|| process.env.EXTERNAL_SERVER === "1"
				|| config.public.externalServer;

			if (isTauri() && isExternalServer) {
				const { homeDir, join } = await import("@tauri-apps/api/path");
				const { exists, mkdir } = await import("@tauri-apps/plugin-fs");

				const home = await homeDir();
				this.rootPath = await join(home, ".meridius", "streamer");

				// Создаём папку streamer, если её нет
				if (!(await exists(this.rootPath))) {
					await mkdir(this.rootPath);
					console.log("[Streamer Mode]: Created streamer directory", this.rootPath);
				}

				this.paths = {
					performer: await join(this.rootPath, "performer.txt"),
					title: await join(this.rootPath, "title.txt"),
					song: await join(this.rootPath, "song.txt"),
					url: await join(this.rootPath, "url.txt"),
					cover: await join(this.rootPath, "cover.jpg")
				};
			} else {
				const response = await authenticatedFetch<{ path: string }>("/api/streamer/path").catch(() => null);
				if (response) {
					this.rootPath = response.path;
				} else {
					console.error("[Streamer Mode]: Failed to get streamer path");
					return false;
				}
			}

			this.initialized = true;
			return true;
		},

		async write(song: TAudio): Promise<boolean> {
			if (!this.rootPath) {
				console.warn("[Streamer Mode]: No root path", {
					rootPath: this.rootPath
				});
				return false;
			}

			const config = useRuntimeConfig();
			const isExternalServer = process.env.EXTERNAL_SERVER === "true"
				|| process.env.EXTERNAL_SERVER === "1"
				|| config.public.externalServer;

			console.log("[Streamer Mode]: Write attempt", {
				isTauri: isTauri(),
				isExternalServer,
				rootPath: this.rootPath
			});

			if (isTauri() && isExternalServer) {
				if (!this.paths) {
					console.error("[Streamer Mode]: Tauri paths not initialized");
					return false;
				}

				const { writeTextFile, writeFile } = await import("@tauri-apps/plugin-fs");

				await writeTextFile(this.paths.performer, song.performer || "");
				await writeTextFile(this.paths.title, song.title || "");
				await writeTextFile(this.paths.song, `${song.performer || ""} — ${song.title || ""}`);
				await writeTextFile(this.paths.url, song.url || "");

				const coverUrl = song.cover || song.coverUrl_p;
				let coverSaved = false;

				if (coverUrl) {
					const coverResponse = await fetch(coverUrl).catch(() => null);

					if (coverResponse && coverResponse.ok) {
						const coverBlob = await coverResponse.blob().catch(() => null);
						
						if (coverBlob) {
							const coverArrayBuffer = await coverBlob.arrayBuffer().catch(() => null);

							if (coverArrayBuffer) {
								const coverUint8Array = new Uint8Array(coverArrayBuffer);
								await writeFile(this.paths.cover, coverUint8Array).catch(() => null);
								coverSaved = true;
							}
						}
					}
				}

				// Если обложка не была сохранена, используем no-cover.webp
				if (!coverSaved) {
					const noCoverResponse = await fetch("/no-cover.webp").catch(() => null);

					if (noCoverResponse && noCoverResponse.ok) {
						const noCoverBlob = await noCoverResponse.blob().catch(() => null);

						if (noCoverBlob) {
							const noCoverArrayBuffer = await noCoverBlob.arrayBuffer().catch(() => null);
							if (noCoverArrayBuffer) {
								const noCoverUint8Array = new Uint8Array(noCoverArrayBuffer);
								await writeFile(this.paths.cover, noCoverUint8Array).catch(() => null);
							}
						}
					}
				}

				console.log("[Streamer Mode]: Written via Tauri");
				return true;
			}

			if (!isExternalServer) {
				if (!this.rootPath) {
					const response = await authenticatedFetch<{ path: string }>("/api/streamer/path").catch(() => null);
					if (response) {
						this.rootPath = response.path;
					} else {
						console.error("[Streamer Mode]: Failed to get streamer path");
						return false;
					}
				}

				console.log("[Streamer Mode]: Writing via server API");
				const result = await authenticatedFetch("/api/streamer/write", {
					method: "POST",
					body: {
						path: this.rootPath,
						song
					}
				}).catch((error) => {
					console.error("[Streamer Mode]: Failed to write via server", error);
					return null;
				});

				if (result) {
					console.log("[Streamer Mode]: Successfully written via server");
				}

				return result !== null;
			}

			console.warn("[Streamer Mode]: No matching condition for write", {
				isTauri: isTauri(),
				isExternalServer
			});

			return false;
		}
	}
});