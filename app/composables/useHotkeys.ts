import { usePlayerStore } from "~/stores/player";
import { usePlaylistStore } from "~/stores/playlist";

const isTauri = typeof window !== "undefined" && "__TAURI__" in window;

const hotkeyCooldowns = new Map<string, number>();
const COOLDOWN_TIME = 200;

const convertToTauriFormat = (accelerator: string): string => {
	if (!accelerator) {
		return "";
	}

	const parts = accelerator.split("+").map(part => part.trim());
	const converted: string[] = [];

	for (const part of parts) {
		if (part === "Ctrl") {
			converted.push("CommandOrControl");
		} else if (part === "Meta") {
			converted.push("Super");
		} else if (part === "Alt" || part === "Shift") {
			converted.push(part);
		} else {
			let key = part;

			if (part.length === 1) {
				key = part.toUpperCase();
			} else if (part.startsWith("Arrow")) {
				key = part.replace("Arrow", "");
			} else if (part.startsWith("F") && /^F\d+$/.test(part)) {
				key = part;
			}

			converted.push(key);
		}
	}

	return converted.join("+");
};

const createHandler = (action: string, handler: () => void) => {
	return (event?: { state?: string }) => {
		if (event && event.state && event.state !== "Pressed") {
			return;
		}

		const now = Date.now();
		const lastTrigger = hotkeyCooldowns.get(action) || 0;

		if (now - lastTrigger < COOLDOWN_TIME) {
			return;
		}

		hotkeyCooldowns.set(action, now);
		handler();
	};
};

export const useHotkeys = () => {
	const playerStore = usePlayerStore();
	const playlistStore = usePlaylistStore();
	const { settings, updateSection } = useSettings();

	const actionHandlers: Record<string, () => void> = {
		playpause: createHandler("playpause", () => {
			if (playerStore.song) {
				playerStore.paused ? playerStore.resume() : playerStore.pause();
			}
		}),

		playnext: createHandler("playnext", () => {
			playerStore.next({ manual: true });
		}),

		playprev: createHandler("playprev", () => {
			playerStore.prev();
		}),

		volup: createHandler("volup", () => {
			const step = settings.value.player.step.hotkey / 100;
			playerStore.setVolume(Math.min(1, playerStore.volume + step));
		}),

		voldown: createHandler("voldown", () => {
			const step = settings.value.player.step.hotkey / 100;
			playerStore.setVolume(Math.max(0, playerStore.volume - step));
		}),

		volmute: createHandler("volmute", () => {
			updateSection("player", {
				mute: !settings.value.player.mute
			});
			playerStore.setVolume(settings.value.player.mute ? 0 : playerStore.volume);
		}),

		rateup: createHandler("rateup", () => {
			const step = settings.value.player.playbackRateStep.hotkey;
			playerStore.setPlaybackRate(Math.min(2, playerStore.playbackRate + step));
		}),

		ratedown: createHandler("ratedown", () => {
			const step = settings.value.player.playbackRateStep.hotkey;
			playerStore.setPlaybackRate(Math.max(0.5, playerStore.playbackRate - step));
		}),

		nextplaylist: createHandler("nextplaylist", () => {
			playlistStore.nextPlaylist();
		}),

		prevplaylist: createHandler("prevplaylist", () => {
			playlistStore.prevPlaylist();
		})
	};

	const registerHotkeys = async () => {
		if (!isTauri || !import.meta.client) {
			return;
		}

		const { register } = await import("@tauri-apps/plugin-global-shortcut");
		const hotkeys = settings.value.hotkeys;

		for (const [action, accelerator] of Object.entries(hotkeys)) {
			if (!accelerator || accelerator.length === 0) {
				continue;
			}

			const tauriAccelerator = convertToTauriFormat(accelerator);

			const handler = actionHandlers[action];

			if (handler) {
				await register(tauriAccelerator, handler).catch((error) => {
					console.error(`Failed to register hotkey ${action}: ${tauriAccelerator}`, error);
				});
			}
		}
	};

	const unregisterHotkeys = async () => {
		if (!isTauri || !import.meta.client) {
			return;
		}

		const { unregisterAll } = await import("@tauri-apps/plugin-global-shortcut");
		await unregisterAll();
	};

	const registerHotkey = async (action: string, accelerator: string) => {
		if (!isTauri || !import.meta.client) {
			return false;
		}

		const { register, unregister } = await import("@tauri-apps/plugin-global-shortcut");

		const handler = actionHandlers[action];

		if (!handler) {
			return false;
		}

		const tauriAccelerator = convertToTauriFormat(accelerator);

		await unregister(tauriAccelerator).catch(() => {});

		await register(tauriAccelerator, handler).catch((error) => {
			console.error(`Failed to register hotkey ${action}: ${tauriAccelerator}`, error);
			return false;
		});

		return true;
	};

	const unregisterHotkey = async (action: string) => {
		if (!isTauri || !import.meta.client) {
			return;
		}

		const { unregister } = await import("@tauri-apps/plugin-global-shortcut");
		const hotkeys = settings.value.hotkeys;
		const accelerator = hotkeys[action];

		if (accelerator) {
			const tauriAccelerator = convertToTauriFormat(accelerator);
			await unregister(tauriAccelerator).catch(() => {});
		}
	};

	return {
		registerHotkeys,
		unregisterHotkeys,
		registerHotkey,
		unregisterHotkey
	};
};

