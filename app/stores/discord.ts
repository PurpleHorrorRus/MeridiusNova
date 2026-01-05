import { Client } from "@xhayper/discord-rpc";
import { ActivityType } from "discord-api-types/v10";

import { usePlayerStore } from "./player";
import { usePlaylistStore } from "./playlist";
import { useSettings } from "~/composables/useSettings";

import type { TAudio } from "~~/server/api/vk/audio/types";

export type TDiscordActivity = {
	type: ActivityType;
	details?: string;
	state?: string;
	largeImageKey?: string;
	smallImageText?: string;
	smallImageKey?: string;
	startTimestamp?: number;
	endTimestamp?: number;
};

let client: Client | null = null;

export const useDiscordStore = defineStore("discord", {
	state: () => ({
		timestamp: 0,
		timeout: null as NodeJS.Timeout | null,
		connected: false
	}),

	actions: {
		async connect() {
			if (client) {
				return true;
			}

			const { settings } = useSettings();

			if (!settings.general.discord.enable) {
				return false;
			}

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
			}

			return connected;
		},

		async setActivity(song?: TAudio) {
			const { settings } = useSettings();

			if (!settings.value.general.discord.enable) {
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

			const activity: TDiscordActivity = {
				type: ActivityType.Listening,
				details: currentSong.performer || "Meridius",
				state: currentSong.title,
				largeImageKey: currentSong.album && typeof currentSong.album === "object" && currentSong.album.thumb?.photo_600
					? currentSong.album.thumb.photo_600
					: (currentSong.coverUrl_p && !/\.svg/.test(currentSong.coverUrl_p) ? currentSong.coverUrl_p : "")
					|| "meridiushq"
			};

			if (playlist && playlist.playlist_id && playlist.playlist_id !== -1) {
				activity.smallImageText = playlist.title;
				activity.smallImageKey = playlist.cover_url || "meridiushq";
			}

			if (!playerStore.paused && settings.value.general.discord.timeline) {
				activity.startTimestamp = Date.now() - playerStore.currentTime * 1000;
				activity.endTimestamp = Date.now() + (currentSong.duration - playerStore.currentTime) * 1000;
			}

			if (settings.value.general.discord.reverse) {
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
			if (!client) {
				return false;
			}

			await this.throttle();

			return client.user?.clearActivity().catch((error) => {
				console.error("[Discord RPC]: Failed to clear activity", error);
				return false;
			});
		},

		async throttle(): Promise<number> {
			const now = Date.now();
			const { settings } = useSettings();
			const delay = 2000; // 2 секунды задержка по умолчанию
			const defaultDelay = 500; // 500мс минимальная задержка

			const timeLeft = this.timestamp !== 0 && now - this.timestamp < delay
				? delay - (now - this.timestamp)
				: defaultDelay;

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

			if (client) {
				client.destroy();
				client = null;
			}

			this.connected = false;
		}
	}
});

