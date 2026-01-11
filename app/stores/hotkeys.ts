import { isTauri } from "~/utils/tauri";

export const useHotkeysStore = defineStore("hotkeys", {
	state: (): {
		registered: Record<string, string>;
	} => ({
		registered: {}
	}),

	actions: {
		async register(action: string, accelerator: string): Promise<boolean> {
			if (!import.meta.client) {
				return false;
			}


			if (isTauri()) {
				const { unregister, register } = await import("@tauri-apps/plugin-global-shortcut");

				if (this.registered[action]) {
					await unregister(this.registered[action]);
				}

				if (accelerator) {
					await register(accelerator, () => {
						this.handleAction(action);
					});
					this.registered[action] = accelerator;
				}
			}

			return true;
		},

		async unregister(action: string): Promise<boolean> {
			if (!import.meta.client) {
				return false;
			}


			if (isTauri() && this.registered[action]) {
				const { unregister } = await import("@tauri-apps/plugin-global-shortcut");
				await unregister(this.registered[action]);
				delete this.registered[action];
			}

			return true;
		},

		async handleAction(action: string): Promise<void> {
			const { usePlayerStore } = await import("~/stores/player");
			const { useSettingsStore } = await import("~/stores/settings");
			
			const playerStore = usePlayerStore();
			const settingsStore = useSettingsStore();
			const settings = settingsStore.settings;
			const { volume, playbackRate } = playerStore;

			switch (action) {
				case "playpause":
					playerStore.toggle();
					break;
				case "playnext":
					await playerStore.next({ manual: true });
					break;
				case "playprev":
					await playerStore.prev();
					break;
				case "volup": {
					const step = settings.player.step.hotkey / 100;
					const newVolume = Math.min(1, volume + step);
					playerStore.setVolume(newVolume);
					break;
				}
				case "voldown": {
					const step = settings.player.step.hotkey / 100;
					const newVolume = Math.max(0, volume - step);
					playerStore.setVolume(newVolume);
					break;
				}
				case "volmute":
					playerStore.toggleMute();
					break;
				case "rateup": {
					const step = settings.player.playbackRateStep.hotkey;
					const newRate = Math.min(2, playbackRate + step);
					playerStore.setPlaybackRate(newRate);
					break;
				}
				case "ratedown": {
					const step = settings.player.playbackRateStep.hotkey;
					const newRate = Math.max(0.5, playbackRate - step);
					playerStore.setPlaybackRate(newRate);
					break;
				}
			}
		}
	}
});
