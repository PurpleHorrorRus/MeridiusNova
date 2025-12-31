import { useSettingsStore } from "~/stores/settings";
import { usePlayerStore } from "~/stores/player";
import { usePlaylistStore } from "~/stores/playlist";
// useHotkeys is auto-imported from app/composables

export default defineNuxtPlugin(async () => {
	const settingsStore = useSettingsStore();
	const playerStore = usePlayerStore();
	const playlistStore = usePlaylistStore();
	const { registerHotkeys } = useHotkeys();
	const { applyTheme } = useTheme();

	await settingsStore.load();

	// Apply theme on load
	if (settingsStore.settings.appearance.theme) {
		applyTheme(settingsStore.settings.appearance.theme);
	}

	// Apply player settings
	if (settingsStore.settings.player.volume !== undefined) {
		playerStore.setVolume(settingsStore.settings.player.volume);
	}

	if (settingsStore.settings.player.playbackRate !== undefined) {
		playerStore.setPlaybackRate(settingsStore.settings.player.playbackRate);
	}

	if (settingsStore.settings.player.mute !== undefined && settingsStore.settings.player.mute !== playerStore.muted) {
		if (settingsStore.settings.player.mute && !playerStore.muted) {
			playerStore.toggleMute();
		} else if (!settingsStore.settings.player.mute && playerStore.muted) {
			playerStore.toggleMute();
		}
	}

	// Apply playlist settings
	if (settingsStore.settings.player.random !== undefined) {
		if (settingsStore.settings.player.random && !playlistStore.shuffle) {
			playlistStore.toggleShuffle();
		} else if (!settingsStore.settings.player.random && playlistStore.shuffle) {
			playlistStore.toggleShuffle();
		}
	}

	if (settingsStore.settings.player.repeat !== undefined) {
		if (settingsStore.settings.player.repeat && !playlistStore.repeat) {
			playlistStore.toggleRepeat();
		} else if (!settingsStore.settings.player.repeat && playlistStore.repeat) {
			playlistStore.toggleRepeat();
		}
	}

	// Initialize equalizer settings
	if (import.meta.client) {
		const { useEqualizerStore } = await import("~/stores/equalizer");
		const equalizerStore = useEqualizerStore();
		
		if (equalizerStore.levels.length === 0 || equalizerStore.levels.every(level => level === 0)) {
			equalizerStore.setLevels(settingsStore.settings.equalizer.levels);
		}
		
		equalizerStore.setEnabled(settingsStore.settings.equalizer.enable);
	}

	if (import.meta.client) {
		await registerHotkeys();
	}

	// Watch for settings changes and save
	watch(() => settingsStore.settings, () => {
		settingsStore.save();
	}, { deep: true });

	// Watch for player volume/playbackRate/muted changes and save
	watch(() => playerStore.volume, (volume) => {
		settingsStore.updateSection("player", { volume });
	});

	watch(() => playerStore.playbackRate, (playbackRate) => {
		settingsStore.updateSection("player", { playbackRate });
	});

	watch(() => playerStore.muted, (muted) => {
		settingsStore.updateSection("player", { mute: muted });
	});

	// Watch for playlist shuffle/repeat changes and save
	watch(() => playlistStore.shuffle, (shuffle) => {
		settingsStore.updateSection("player", { random: shuffle });
	});

	watch(() => playlistStore.repeat, (repeat) => {
		settingsStore.updateSection("player", { repeat });
	});

	// Watch for theme changes and apply
	watch(() => settingsStore.settings.appearance.theme, (theme) => {
		if (theme) {
			applyTheme(theme);
		}
	});
});

