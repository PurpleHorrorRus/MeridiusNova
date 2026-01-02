import { usePlayerStore } from "~/stores/player";
import { usePlaylistStore } from "~/stores/playlist";
// useHotkeys is auto-imported from app/composables

export default defineNuxtPlugin(async () => {
	const { settings, load, updateSection, save } = useSettings();
	const playerStore = usePlayerStore();
	const playlistStore = usePlaylistStore();
	const { registerHotkeys } = useHotkeys();
	const { applyTheme } = useTheme();

	await load();

	// Apply theme on load
	if (settings.value.appearance.theme) {
		applyTheme(settings.value.appearance.theme);
	}

	// Apply player settings
	if (settings.value.player.volume !== undefined) {
		playerStore.setVolume(settings.value.player.volume);
	}

	if (settings.value.player.playbackRate !== undefined) {
		playerStore.setPlaybackRate(settings.value.player.playbackRate);
	}

	if (settings.value.player.mute !== undefined && settings.value.player.mute !== playerStore.muted) {
		if (settings.value.player.mute && !playerStore.muted) {
			playerStore.toggleMute();
		} else if (!settings.value.player.mute && playerStore.muted) {
			playerStore.toggleMute();
		}
	}

	// Apply playlist settings
	if (settings.value.player.random !== undefined) {
		if (settings.value.player.random && !playlistStore.shuffle) {
			playlistStore.toggleShuffle();
		} else if (!settings.value.player.random && playlistStore.shuffle) {
			playlistStore.toggleShuffle();
		}
	}

	if (settings.value.player.repeat !== undefined) {
		if (settings.value.player.repeat && !playlistStore.repeat) {
			playlistStore.toggleRepeat();
		} else if (!settings.value.player.repeat && playlistStore.repeat) {
			playlistStore.toggleRepeat();
		}
	}

	// Initialize equalizer settings
	if (import.meta.client) {
		const { useEqualizerStore } = await import("~/stores/equalizer");
		const equalizerStore = useEqualizerStore();
		
		if (equalizerStore.levels.length === 0 || equalizerStore.levels.every(level => level === 0)) {
			equalizerStore.setLevels(settings.value.equalizer.levels);
		}
		
		equalizerStore.setEnabled(settings.value.equalizer.enable);
	}

	if (import.meta.client) {
		await registerHotkeys();
	}

	// Watch for settings changes and save
	watch(() => settings.value, () => {
		save();
	}, { deep: true });

	// Watch for player volume/playbackRate/muted changes and save
	watch(() => playerStore.volume, (volume) => {
		updateSection("player", { volume });
	});

	watch(() => playerStore.playbackRate, (playbackRate) => {
		updateSection("player", { playbackRate });
	});

	watch(() => playerStore.muted, (muted) => {
		updateSection("player", { mute: muted });
	});

	// Watch for playlist shuffle/repeat changes and save
	watch(() => playlistStore.shuffle, (shuffle) => {
		updateSection("player", { random: shuffle });
	});

	watch(() => playlistStore.repeat, (repeat) => {
		updateSection("player", { repeat });
	});

	// Watch for theme changes and apply
	watch(() => settings.value.appearance.theme, (theme) => {
		if (theme) {
			applyTheme(theme);
		}
	});

	// Auto-check for updates on startup (only in Tauri)
	if (import.meta.client) {
		const isTauri = typeof window !== "undefined" && "__TAURI__" in window;
		
		if (isTauri) {
			setTimeout(async () => {
				const { useUpdater } = await import("~/composables/useUpdater");
				const { checkForUpdates } = useUpdater();
				await checkForUpdates();
			}, 3000);
		}
	}
});

