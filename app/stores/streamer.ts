import type { TAudio } from "~~/server/api/vk/audio/types";
import { isTauri } from "~/utils/tauri";

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
		initialized: boolean;
	} => ({
		paths: null,
		initialized: false
	}),

	actions: {
		async init(rootPath: string): Promise<boolean> {
			if (!import.meta.client) {
				return false;
			}


			if (!isTauri()) {
				return false;
			}

			const { join } = await import("@tauri-apps/api/path");
			const { exists, create } = await import("@tauri-apps/plugin-fs");

			const rootExists = await exists(rootPath);

			if (!rootExists) {
				await create(rootPath);
			}

			this.paths = {
				performer: await join(rootPath, "performer.txt"),
				title: await join(rootPath, "title.txt"),
				song: await join(rootPath, "song.txt"),
				url: await join(rootPath, "url.txt"),
				cover: await join(rootPath, "cover.jpg")
			};

			this.initialized = true;
			return true;
		},

		async write(song: TAudio): Promise<boolean> {
			if (!this.paths || !this.initialized) {
				return false;
			}


			if (isTauri()) {
				const { writeTextFile, writeFile } = await import("@tauri-apps/plugin-fs");

				await writeTextFile(this.paths.performer, song.performer || "");
				await writeTextFile(this.paths.title, song.title || "");
				await writeTextFile(this.paths.song, `${song.performer || ""} — ${song.title || ""}`);
				await writeTextFile(this.paths.url, song.url || "");

				if (song.coverUrl_p || song.cover) {
					const coverUrl = song.coverUrl_p || song.cover || "";
					const coverResponse = await fetch(coverUrl || "");
					const coverBlob = await coverResponse.blob();
					const coverArrayBuffer = await coverBlob.arrayBuffer();
					const coverUint8Array = new Uint8Array(coverArrayBuffer);

					await writeFile(this.paths.cover, coverUint8Array);
				}
			}

			return true;
		}
	}
});