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

			const isTauri = typeof window !== "undefined" && "__TAURI__" in window;

			if (isTauri) {
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

			const isTauri = typeof window !== "undefined" && "__TAURI__" in window;

			if (isTauri && this.registered[action]) {
				const { unregister } = await import("@tauri-apps/plugin-global-shortcut");
				await unregister(this.registered[action]);
				delete this.registered[action];
			}

			return true;
		},

		async handleAction(action: string): Promise<void> {
			const {
				playNext,
				playPrevious,
				toggle,
				setVolume,
				setPlaybackRate,
				toggleMute,
				volume,
				playbackRate,
			} = useAudio();

			const { useSettings } = await import("~/composables/useSettings");
			const { settings } = useSettings();

			switch (action) {
				case "playpause":
					toggle();
					break;
				case "playnext":
					playNext();
					break;
				case "playprev":
					playPrevious();
					break;
				case "volup": {
					const step = settings.value.player.step.hotkey / 100;
					const newVolume = Math.min(1, volume.value + step);
					setVolume(newVolume);
					break;
				}
				case "voldown": {
					const step = settings.value.player.step.hotkey / 100;
					const newVolume = Math.max(0, volume.value - step);
					setVolume(newVolume);
					break;
				}
				case "volmute":
					toggleMute();
					break;
				case "rateup": {
					const step = settings.value.player.playbackRateStep.hotkey;
					const newRate = Math.min(2, playbackRate.value + step);
					setPlaybackRate(newRate);
					break;
				}
				case "ratedown": {
					const step = settings.value.player.playbackRateStep.hotkey;
					const newRate = Math.max(0.5, playbackRate.value - step);
					setPlaybackRate(newRate);
					break;
				}
			}
		}
	}
});
