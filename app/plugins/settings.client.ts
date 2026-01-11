import { storeToRefs } from "pinia";

import { usePlayerStore } from "~/stores/player";
import { usePlaylistStore } from "~/stores/playlist";
import { useSettingsStore } from "~/stores/settings";
// useHotkeys is auto-imported from app/composables

export default defineNuxtPlugin(async () => {
	const settingsStore = useSettingsStore();
	const { settings } = storeToRefs(settingsStore);
	const playerStore = usePlayerStore();
	const playlistStore = usePlaylistStore();
	const { registerHotkeys } = useHotkeys();
	const { applyTheme } = useTheme();

	await settingsStore.load();

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

	// Watch for theme changes and apply
	watch(() => settings.value.appearance.theme, (theme) => {
		if (theme) {
			applyTheme(theme);
		}
	});

});

