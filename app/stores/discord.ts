import { usePlayerStore } from "./player";
import { usePlaylistStore } from "./playlist";
import { useSettingsStore } from "./settings";

import type { TAudio } from "~~/server/api/vk/audio/types";

export type TDiscordActivity = {
	type: number;
	details?: string;
	state?: string;
	largeImageKey?: string;
	smallImageText?: string;
	smallImageKey?: string;
	startTimestamp?: number;
	endTimestamp?: number;
};

let client: any = null;

export const useDiscordStore = defineStore("discord", {
	state: () => ({
		timestamp: 0,
		timeout: null as NodeJS.Timeout | null,
		connected: false
	}),

	actions: {
		async connect() {
			if (!import.meta.client) {
				return false;
			}

			const isTauri = typeof window !== "undefined" && "__TAURI__" in window;
			if (!isTauri) {
				return false;
			}

			if (client) {
				return true;
			}

			const settingsStore = useSettingsStore();
			
			if (!settingsStore.settings.general.discord.enable) {
				return false;
			}

			console.log("[Discord RPC]: Connecting...");

			const { Client } = await import("@xhayper/discord-rpc");

			const clientId = process.env.DISCORD_CLIENT_ID || "";
			const clientSecret = process.env.DISCORD_CLIENT_SECRET || "";

			if (!clientId || !clientSecret) {
				console.error("[Discord RPC]: Client ID or Secret not configured");
				return false;
			}
			
			client = new Client({
				clientId,
				clientSecret,
				transport: { type: "ipc" }
			});

			const connected = await client.connect().catch((error) => {
				console.error("[Discord RPC]: Failed to connect", error);
				client = null;
				return false;
			});

			if (connected) {
				this.connected = true;
				console.log("[Discord RPC]: Ready");
			}

			return connected;
		},

		async setActivity(song?: TAudio) {
			if (!import.meta.client) {
				return false;
			}

			const isTauri = typeof window !== "undefined" && "__TAURI__" in window;
			if (!isTauri) {
				return false;
			}

			const settingsStore = useSettingsStore();

			if (!settingsStore.settings.general.discord.enable) {
				return false;
			}

			if (!client) {
				const connected = await this.connect();
				if (!connected) {
					return false;
				}
			}

			await this.throttle();

			const playerStore = usePlayerStore();
			const playlistStore = usePlaylistStore();

			const currentSong = song || playerStore.song;
			if (!currentSong) {
				return false;
			}

			const playlist = playlistStore.playing || playlistStore.current;

			const albumThumb = currentSong.album && typeof currentSong.album === "object" && !Array.isArray(currentSong.album) && "thumb" in currentSong.album && currentSong.album.thumb && typeof currentSong.album.thumb === "object" && "photo_600" in currentSong.album.thumb
				? currentSong.album.thumb.photo_600
				: undefined;

			const { ActivityType } = await import("discord-api-types/v10");

			const activity: TDiscordActivity = {
				type: ActivityType.Listening,
				details: currentSong.performer || "Meridius",
				state: currentSong.title,
				largeImageKey: albumThumb || (currentSong.coverUrl_p && !/\.svg/.test(currentSong.coverUrl_p) ? currentSong.coverUrl_p : "") || "meridiushq"
			};

			console.log("[Discord RPC]: Update activity", currentSong.full_id);

			if (playlist && playlist.playlist_id && playlist.playlist_id !== -1) {
				activity.smallImageText = playlist.title;
				activity.smallImageKey = playlist.cover_url || "meridiushq";
			}

			if (!playerStore.paused && settingsStore.settings.general.discord.timeline) {
				activity.startTimestamp = Date.now() - playerStore.currentTime * 1000;
				activity.endTimestamp = Date.now() + (currentSong.duration - playerStore.currentTime) * 1000;
			}

			if (settingsStore.settings.general.discord.reverse) {
				const details = activity.details;
				activity.details = activity.state;
				activity.state = details;
			}

			return client?.user?.setActivity(activity).catch((error) => {
				console.error("[Discord RPC]: Failed to update activity", error);
				return false;
			});
		},

		async clearActivity() {
			if (!import.meta.client) {
				return false;
			}

			const isTauri = typeof window !== "undefined" && "__TAURI__" in window;
			if (!isTauri) {
				return false;
			}

			if (!client) {
				return false;
			}

			await this.throttle();
			console.log("[Discord RPC]: Clear activity");

			return client.user?.clearActivity().catch((error) => {
				console.error("[Discord RPC]: Failed to clear activity", error);
				return false;
			});
		},

		async throttle(): Promise<number> {
			const now = Date.now();
			const delay = 2000; // 2 секунды задержка по умолчанию
			const defaultDelay = 500; // 500мс минимальная задержка

			const timeLeft = this.timestamp !== 0 && now - this.timestamp < delay
				? delay - (now - this.timestamp)
				: defaultDelay;

			console.log("[Discord RPC]: Throttle =", timeLeft, "ms");

			if (this.timeout) {
				clearTimeout(this.timeout);
			}

			return new Promise((resolve) => {
				this.timeout = setTimeout(() => {
					this.timestamp = Date.now();
					resolve(this.timestamp);
				}, timeLeft);
			});
		},

		disconnect() {
			if (this.timeout) {
				clearTimeout(this.timeout);
				this.timeout = null;
			}

			if (import.meta.client && client) {
				client.destroy();
				client = null;
			}

			this.connected = false;
		}
	}
});

