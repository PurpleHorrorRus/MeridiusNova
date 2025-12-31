<template>
	<div class="settings-tab-general">
		<div class="settings-section">
			<h2 class="section-title">{{ getString("settings.general.language.title") }}</h2>
			<div class="settings-items">
				<div class="settings-item">
					<label class="settings-label">{{ getString("settings.general.language.title") }}</label>
					<select
						:value="settings.general.lang"
						@change="updateLang"
						class="settings-select"
					>
						<option value="ru">{{ getString("settings.general.language.russian") }}</option>
						<option value="en">{{ getString("settings.general.language.english") }}</option>
					</select>
				</div>
			</div>
		</div>

		<div class="settings-section">
			<h2 class="section-title">{{ getString("settings.general.window.title") }}</h2>
			<div class="settings-items">
				<div class="settings-item">
					<label class="settings-label">
						<input
							type="checkbox"
							:checked="settings.window.startup"
							@change="updateStartup"
							class="settings-checkbox"
						/>
						{{ getString("settings.general.window.startup") }}
					</label>
				</div>

				<div class="settings-item">
					<label class="settings-label">
						<input
							type="checkbox"
							:checked="settings.window.hideOnClose"
							@change="updateHideOnClose"
							class="settings-checkbox"
						/>
						{{ getString("settings.general.window.hideOnClose") }}
					</label>
				</div>
			</div>
		</div>

		<div class="settings-section">
			<h2 class="section-title">{{ getString("settings.general.discord.title") }}</h2>
			<div class="settings-items">
				<div class="settings-item">
					<label class="settings-label">
						<input
							type="checkbox"
							:checked="settings.general.discord.enable"
							@change="updateDiscordEnable"
							class="settings-checkbox"
						/>
						{{ getString("settings.general.discord.enable") }}
					</label>
				</div>

				<div v-if="settings.general.discord.enable" class="settings-item">
					<label class="settings-label">
						<input
							type="checkbox"
							:checked="settings.general.discord.timeline"
							@change="updateDiscordTimeline"
							class="settings-checkbox"
						/>
						{{ getString("settings.general.discord.timeline") }}
					</label>
				</div>

				<div v-if="settings.general.discord.enable" class="settings-item">
					<label class="settings-label">
						<input
							type="checkbox"
							:checked="settings.general.discord.reverse"
							@change="updateDiscordReverse"
							class="settings-checkbox"
						/>
						{{ getString("settings.general.discord.reverse") }}
					</label>
				</div>
			</div>
		</div>

		<div class="settings-section">
			<h2 class="section-title">{{ getString("settings.general.streamer.title") }}</h2>
			<div class="settings-items">
				<div class="settings-item">
					<label class="settings-label">
						<input
							type="checkbox"
							:checked="settings.general.streamer.enable"
							@change="updateStreamerEnable"
							class="settings-checkbox"
						/>
						{{ getString("settings.general.streamer.enable") }}
					</label>
				</div>

				<div v-if="streamerHint" class="settings-tip">
					{{ streamerHint }}
				</div>

				<div v-if="settings.general.streamer.enable" class="settings-item">
					<label class="settings-label">{{ getString("settings.general.streamer.path") }}</label>
					<div class="settings-input-group">
						<input
							:value="settings.general.streamer.path"
							@input="updateStreamerPath"
							type="text"
							class="settings-input"
							:placeholder="getString('settings.general.streamer.pathPlaceholder')"
						/>
						<button
							@click="chooseStreamerPath"
							class="settings-button"
						>
							{{ getString("settings.general.streamer.choose") }}
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { useSettingsStore } from "~/stores/settings";
import { useStreamerStore } from "~/stores/streamer";

const { getString, loadLanguage } = useStrings();
const settingsStore = useSettingsStore();
const streamerStore = useStreamerStore();

const settings = computed(() => settingsStore.settings);

const streamerHint = computed(() => {
	const lang = settings.value.general.lang as "ru" | "en";
	return settings.value.settingHints[lang]?.general?.streamer;
});

const updateLang = async (event: Event) => {
	const target = event.target as HTMLSelectElement;
	const newLang = target.value;
	settingsStore.updateSection("general", { lang: newLang });
	await loadLanguage(newLang);
};

const updateStartup = async (event: Event) => {
	const target = event.target as HTMLInputElement;
	const isTauri = typeof window !== "undefined" && "__TAURI__" in window;

	if (isTauri && import.meta.client) {
		const { invoke } = await import("@tauri-apps/api/core");
		await invoke("set_startup", { enable: target.checked });
	}

	settingsStore.updateSection("window", { startup: target.checked });
};

const updateHideOnClose = (event: Event) => {
	const target = event.target as HTMLInputElement;
	settingsStore.updateSection("window", { hideOnClose: target.checked });
};

const updateDiscordEnable = async (event: Event) => {
	const target = event.target as HTMLInputElement;
	settingsStore.updateSection("general", {
		discord: {
			...settings.value.general.discord,
			enable: target.checked
		}
	});

	if (import.meta.client && target.checked) {
		const { useDiscordStore } = await import("~/stores/discord");
		const discordStore = useDiscordStore();
		await discordStore.connect();
		const playerStore = await import("~/stores/player").then(m => m.usePlayerStore());
		if (playerStore().song) {
			await discordStore.setActivity(playerStore().song);
		}
	} else if (import.meta.client && !target.checked) {
		const { useDiscordStore } = await import("~/stores/discord");
		const discordStore = useDiscordStore();
		await discordStore.clearActivity();
	}
};

const updateDiscordTimeline = (event: Event) => {
	const target = event.target as HTMLInputElement;
	settingsStore.updateSection("general", {
		discord: {
			...settings.value.general.discord,
			timeline: target.checked
		}
	});
};

const updateDiscordReverse = (event: Event) => {
	const target = event.target as HTMLInputElement;
	settingsStore.updateSection("general", {
		discord: {
			...settings.value.general.discord,
			reverse: target.checked
		}
	});
};

const updateStreamerEnable = async (event: Event) => {
	const target = event.target as HTMLInputElement;
	settingsStore.updateSection("general", {
		streamer: {
			...settings.value.general.streamer,
			enable: target.checked
		}
	});

	if (target.checked && settings.value.general.streamer.path) {
		await streamerStore.init(settings.value.general.streamer.path);
	}
};

const updateStreamerPath = (event: Event) => {
	const target = event.target as HTMLInputElement;
	settingsStore.updateSection("general", {
		streamer: {
			...settings.value.general.streamer,
			path: target.value
		}
	});
};

const chooseStreamerPath = async () => {
	const isTauri = typeof window !== "undefined" && "__TAURI__" in window;

	if (isTauri && import.meta.client) {
		const { open } = await import("@tauri-apps/plugin-dialog");
		const selected = await open({
			directory: true,
			multiple: false
		});

		if (selected && typeof selected === "string") {
			settingsStore.updateSection("general", {
				streamer: {
					...settings.value.general.streamer,
					path: selected
				}
			});

			if (settings.value.general.streamer.enable) {
				await streamerStore.init(selected);
			}
		}
	}
};
</script>

<style scoped lang="scss">
.settings-tab-general {
	display: flex;
	flex-direction: column;
	gap: 40px;
}

.settings-section {
	display: flex;
	flex-direction: column;
	gap: 20px;
}

.section-title {
	font-size: 22px;
	font-weight: 600;
	margin: 0;
	color: var(--text, #fff);
	letter-spacing: -0.3px;

	@media (max-width: 768px) {
		font-size: 18px;
	}
}

.settings-items {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.settings-item {
	display: flex;
	align-items: center;
	gap: 16px;
	padding: 16px;
	background: var(--bg-secondary, #1a1a1a);
	border: 1px solid var(--border, #282828);
	border-radius: 10px;
	transition: all 0.2s ease;
	box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	max-width: 100%;
	box-sizing: border-box;

	@media (max-width: 768px) {
		flex-wrap: wrap;
		padding: 14px;
		gap: 12px;
	}

	&:hover {
		background: var(--bg-tertiary, #282828);
		border-color: var(--border-secondary, #2a2a2a);
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
	}
}

.settings-label {
	display: flex;
	align-items: center;
	gap: 10px;
	font-size: 14px;
	font-weight: 500;
	color: var(--text, #fff);
	flex: 1;
	line-height: 1.5;
}

.settings-checkbox {
	width: 20px;
	height: 20px;
	cursor: pointer;
	accent-color: var(--secondary, #e9003f);
	transition: transform 0.15s ease;

	&:hover {
		transform: scale(1.1);
	}
}

.settings-select {
	padding: 10px 14px;
	background: var(--bg-tertiary, #2a2a2a);
	border: 1px solid var(--border, #3a3a3a);
	border-radius: 6px;
	color: var(--text, #fff);
	font-size: 14px;
	font-weight: 500;
	cursor: pointer;
	outline: none;
	transition: all 0.2s ease;
	min-width: 200px;
	max-width: 100%;
	box-sizing: border-box;

	@media (max-width: 768px) {
		min-width: 150px;
		width: 100%;
	}

	@media (max-width: 480px) {
		min-width: 0;
		width: 100%;
	}

	&:hover {
		border-color: var(--secondary, #e9003f);
		background: var(--bg-hover, #2a2a2a);
	}

	&:focus {
		border-color: var(--secondary, #e9003f);
		box-shadow: 0 0 0 3px rgba(233, 0, 63, 0.1);
	}
}

.settings-input-group {
	display: flex;
	gap: 10px;
	flex: 1;
	min-width: 0;

	@media (max-width: 768px) {
		flex-direction: column;
		width: 100%;
	}
}

.settings-input {
	flex: 1;
	padding: 10px 14px;
	background: var(--bg-tertiary, #2a2a2a);
	border: 1px solid var(--border, #3a3a3a);
	border-radius: 6px;
	color: var(--text, #fff);
	font-size: 14px;
	font-weight: 500;
	outline: none;
	transition: all 0.2s ease;
	min-width: 0;
	max-width: 100%;
	box-sizing: border-box;

	@media (max-width: 768px) {
		width: 100%;
	}

	&:hover {
		border-color: var(--secondary, #e9003f);
		background: var(--bg-hover, #2a2a2a);
	}

	&:focus {
		border-color: var(--secondary, #e9003f);
		box-shadow: 0 0 0 3px rgba(233, 0, 63, 0.1);
	}

	&::placeholder {
		color: var(--text-tertiary, #6b6b6b);
	}
}

.settings-button {
	padding: 10px 20px;
	background: var(--secondary, #e9003f);
	border: none;
	border-radius: 6px;
	color: var(--text, #fff);
	font-size: 14px;
	font-weight: 500;
	cursor: pointer;
	transition: all 0.2s ease;
	white-space: nowrap;

	&:hover {
		background: var(--primary-hover, #ff1a5c);
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(233, 0, 63, 0.3);
	}

	&:active {
		transform: translateY(0);
	}
}

.settings-tip {
	display: block;
	width: 100%;
	margin: 4px 0 0 0;
	padding: 12px 16px;
	font-size: 13px;
	color: var(--text-secondary, #b3b3b3);
	line-height: 1.5;
	background: var(--bg-tertiary, #282828);
	border: 1px solid var(--border, #282828);
	border-radius: 8px;
	border-left: 3px solid var(--secondary, #e9003f);
}
</style>
