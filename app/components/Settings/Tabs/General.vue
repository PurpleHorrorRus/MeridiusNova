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

	<div v-if="isTauri()" class="settings-section">
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

	<div v-if="!isExternalServer" class="settings-section">
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

	<div v-if="!isMobile && (isTauri() || !isExternalServer)" class="settings-section">
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

			<div class="settings-tip" v-text="getString('settings.hints.general.streamer')" />
		</div>
	</div>

	<div v-if="isTauri()" class="settings-section">
		<h2 class="section-title">{{ getString("settings.general.server.title") }}</h2>
		<div class="settings-items">
			<div v-if="settings.general.server.enable || isExternalServer" class="settings-item settings-item-warning">
				<div class="settings-warning-content">
					<Icon name="mdi:server-network" class="settings-warning-icon" />
					<div class="settings-warning-text">
						<div class="settings-warning-title">{{ getString("settings.general.server.remoteActive") }}</div>
						<div class="settings-warning-description">{{ getString("settings.general.server.remoteActiveDescription") }}</div>
					</div>
				</div>
				<button
					@click="switchToLocalServer"
					class="settings-button settings-button-secondary"
				>
					<Icon name="mdi:server" class="settings-button-icon" />
					{{ getString("settings.general.server.switchToLocal") }}
				</button>
			</div>

			<div v-if="!isExternalServer" class="settings-item">
				<label class="settings-label">
					<input
						type="checkbox"
						:checked="settings.general.server.enable"
						@change="updateServerEnable"
						class="settings-checkbox"
					/>
					{{ getString("settings.general.server.enable") }}
				</label>
			</div>

			<div v-if="settings.general.server.enable" class="settings-item">
				<label class="settings-label settings-label-block">{{ getString("settings.general.server.url") }}</label>
				<div class="settings-input-group">
					<input
						:value="settings.general.server.url"
						@input="updateServerUrl"
						type="text"
						class="settings-input"
						:placeholder="getString('settings.general.server.urlPlaceholder')"
					/>
					<span class="settings-separator">:</span>
					<input
						:value="settings.general.server.port"
						@input="updateServerPort"
						type="number"
						min="1"
						max="65535"
						class="settings-input settings-input-port"
						:placeholder="getString('settings.general.server.portPlaceholder')"
					/>
					<button
						@click="isServerAvailable === true ? connectToServer() : checkServer()"
						:disabled="checking || !settings.general.server.url"
						class="settings-button"
						:class="{ 'settings-button-primary': isServerAvailable === true }"
					>
						<Icon
							v-if="checking"
							name="mdi:loading"
							class="settings-button-icon spinning"
						/>
						{{
							checking
								? getString("settings.general.server.checking")
								: isServerAvailable === true
									? getString("settings.general.server.connect")
									: getString("settings.general.server.check")
						}}
					</button>
				</div>
			</div>

			<div v-if="settings.general.server.enable && serverError" class="settings-tip settings-error">
				<Icon name="mdi:alert-circle" class="settings-tip-icon" />
				{{ serverError }}
			</div>

			<div v-if="settings.general.server.enable && isServerAvailable === true && !serverError" class="settings-tip settings-success">
				<Icon name="mdi:check-circle" class="settings-tip-icon" />
				{{ getString("settings.general.server.available") }}
			</div>
		</div>
	</div>

	<div v-if="isTauri()" class="settings-section">
		<h2 class="section-title">{{ getString("settings.general.updates.title") }}</h2>
		<div class="settings-items">
			<div class="settings-item">
				<label class="settings-label">{{ getString("settings.general.updates.currentVersion") }}</label>
				<span class="settings-version">{{ currentVersion || "—" }}</span>
			</div>

			<div class="settings-item">
				<label class="settings-label">{{ getString("settings.general.updates.channel") }}</label>
				<select
					:value="settings.general.updateChannel"
					@change="updateChannel"
					class="settings-select"
				>
					<option value="production">{{ getString("settings.general.updates.channelOptions.production") }}</option>
					<option value="beta">{{ getString("settings.general.updates.channelOptions.beta") }}</option>
					<option value="development">{{ getString("settings.general.updates.channelOptions.development") }}</option>
				</select>
			</div>

			<div class="settings-item">
				<button
					@click="checkUpdates"
					:disabled="checkingUpdates"
					class="settings-button"
				>
					{{ checkingUpdates ? getString("settings.general.updates.checking") : getString("settings.general.updates.check") }}
				</button>
			</div>

			<div v-if="updateError" class="settings-tip settings-error">
				{{ updateError }}
			</div>

			<div v-if="updateAvailable && !updateError && updateInfo" class="settings-tip settings-success">
				{{ getString("settings.general.updates.available") }}: {{ updateInfo.version }}
			</div>

			<div v-if="updateAvailable && !updateError" class="settings-item">
				<button
					@click="installUpdate"
					class="settings-button settings-button-primary"
				>
					{{ getString("settings.general.updates.install") }}
				</button>
			</div>
		</div>
	</div>
	</div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";

import { useStreamerStore } from "~/stores/streamer";
import { useSettingsStore } from "~/stores/settings";

import { useServerCheck } from "~/composables/useServerCheck";
import { useUpdater } from "~/composables/useUpdater";
import { useIsMobile } from "~/composables/useIsMobile";

import { isTauri } from "~/utils/tauri";

const { getString, loadLanguage } = useStrings();
const { isMobile } = useIsMobile();
const settingsStore = useSettingsStore();
const { settings } = storeToRefs(settingsStore);
const streamerStore = useStreamerStore();
const { checking, isAvailable: isServerAvailable, error: serverError, checkServer: checkServerHealth, reset: resetServerCheck } = useServerCheck();

const config = useRuntimeConfig();
const isExternalServer = process.env.EXTERNAL_SERVER === "true"
	|| process.env.EXTERNAL_SERVER === "1"
	|| config.public.externalServer;
const {
	currentVersion,
	checking: checkingUpdates,
	updateAvailable,
	updateError,
	updateInfo,
	getUpdateChannel,
	setUpdateChannel,
	checkForUpdates,
	installUpdate: installUpdateHandler
} = useUpdater();


const updateLang = async (event: Event) => {
	const target = event.target as HTMLSelectElement;
	const newLang = target.value;
	settingsStore.updateSection("general", { lang: newLang });
	await loadLanguage(newLang);
};

const updateStartup = async (event: Event) => {
	const target = event.target as HTMLInputElement;

	if (isTauri() && import.meta.client) {
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
		const { usePlayerStore } = await import("~/stores/player");
		const playerStore = usePlayerStore();
		if (playerStore.song) {
			await discordStore.setActivity(playerStore.song);
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

	if (target.checked) {
		await streamerStore.init();
	}
};

const updateServerEnable = (event: Event) => {
	const target = event.target as HTMLInputElement;
	settingsStore.updateSection("general", {
		server: {
			...settings.value.general.server,
			enable: target.checked
		}
	});
	resetServerCheck();
};

const updateServerUrl = (event: Event) => {
	const target = event.target as HTMLInputElement;
	settingsStore.updateSection("general", {
		server: {
			...settings.value.general.server,
			url: target.value
		}
	});
	resetServerCheck();
};

const updateServerPort = (event: Event) => {
	const target = event.target as HTMLInputElement;
	const port = parseInt(target.value, 10);
	if (!isNaN(port) && port > 0 && port <= 65535) {
		settingsStore.updateSection("general", {
			server: {
				...settings.value.general.server,
				port: port
			}
		});
		resetServerCheck();
	}
};

const checkServer = async () => {
	if (!settings.value.general.server.url) {
		return;
	}

	let serverUrl = settings.value.general.server.url;
	if (!serverUrl.includes("://")) {
		serverUrl = `http://${serverUrl}`;
	}

	const url = new URL(serverUrl);
	if (!url.port && settings.value.general.server.port) {
		url.port = settings.value.general.server.port.toString();
	}

	await checkServerHealth(url.toString());
};

const connectToServer = async () => {
	if (isTauri() && import.meta.client) {
		await settingsStore.save();
		
		await new Promise(resolve => setTimeout(resolve, 500));

		const { invoke } = await import("@tauri-apps/api/core");
		await invoke("restart_app");
	}
};

const switchToLocalServer = async () => {
	if (isTauri() && import.meta.client) {
		settingsStore.settings.general.server.enable = false;
		
		await settingsStore.save();
		resetServerCheck();
		
		await new Promise(resolve => setTimeout(resolve, 1000));

		const { invoke } = await import("@tauri-apps/api/core");
		await invoke("restart_app");
	}
};

const updateChannel = async (event: Event) => {
	const target = event.target as HTMLSelectElement;
	await setUpdateChannel(target.value as "production" | "beta" | "development");
};

const checkUpdates = async () => {
	await checkForUpdates();
};

const installUpdate = async () => {
	const success = await installUpdateHandler();
	if (success) {
		const { invoke } = await import("@tauri-apps/api/core");
		await invoke("restart_app");
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
	align-items: flex-start;
	flex-wrap: wrap;
	gap: 16px;
	padding: 16px;
	background: var(--bg-secondary, #1a1a1a);
	border: 1px solid var(--border, #282828);
	border-radius: 10px;
	transition: background-color 0.2s ease, border-color 0.2s ease;
	box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	max-width: 100%;
	box-sizing: border-box;

	@media (max-width: 768px) {
		flex-wrap: wrap;
		padding: 14px;
		gap: 12px;
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

.settings-label-block {
	flex: 0 0 100%;
	margin-bottom: 8px;
}

.settings-checkbox {
	width: 20px;
	height: 20px;
	cursor: pointer;
	accent-color: var(--secondary, #e9003f);
}

.settings-radio-group {
	display: flex;
	flex-direction: column;
	gap: 12px;
	width: 100%;
}

.settings-radio-label {
	display: flex;
	align-items: center;
	gap: 10px;
	font-size: 14px;
	font-weight: 500;
	color: var(--text, #fff);
	cursor: pointer;
}

.settings-radio {
	width: 18px;
	height: 18px;
	cursor: pointer;
	accent-color: var(--secondary, #e9003f);
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
	transition: background-color 0.2s ease, border-color 0.2s ease;
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
	align-items: center;
	flex-wrap: nowrap;
	width: 100%;
}

.settings-separator {
	color: var(--text-secondary, #b3b3b3);
	font-size: 14px;
	font-weight: 500;
	flex-shrink: 0;
}

.settings-input-port {
	width: 70px !important;
	min-width: 70px !important;
	max-width: 70px !important;
	flex: 0 0 70px !important;
}

.settings-input-port::-webkit-outer-spin-button,
.settings-input-port::-webkit-inner-spin-button {
	-webkit-appearance: none;
	margin: 0;
}

.settings-input-port[type=number] {
	-moz-appearance: textfield;
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
	transition: background-color 0.2s ease, border-color 0.2s ease;
	min-width: 0;
	max-width: 100%;
	box-sizing: border-box;
	flex-shrink: 1;

	&:focus {
		border-color: var(--secondary, #e9003f);
		box-shadow: 0 0 0 3px rgba(233, 0, 63, 0.1);
	}

	&::placeholder {
		color: var(--text-tertiary, #6b6b6b);
	}
}

.settings-button {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 6px;
	padding: 10px 20px;
	background: var(--secondary, #e9003f);
	border: none;
	border-radius: 6px;
	color: var(--text, #fff);
	font-size: 14px;
	font-weight: 500;
	cursor: pointer;
	transition: transform 0.2s ease, background-color 0.2s ease;
	white-space: nowrap;
	flex-shrink: 0;

	&:active {
		transform: translateY(0);
	}
}

.settings-tip {
	display: flex;
	align-items: center;
	gap: 8px;
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

.settings-tip-icon {
	flex-shrink: 0;
	width: 18px;
	height: 18px;
}

.settings-error {
	color: #ff4444;
	border-left-color: #ff4444;
}

.settings-success {
	color: #44ff44;
	border-left-color: #44ff44;
}

.settings-button-primary {
	flex-shrink: 0;
}

.settings-button-icon {
	width: 16px;
	height: 16px;
	flex-shrink: 0;
}

.spinning {
	animation: spin 1s linear infinite;
}

@keyframes spin {
	from {
		transform: rotate(0deg);
	}
	to {
		transform: rotate(360deg);
	}
}

.settings-version {
	font-size: 14px;
	font-weight: 500;
	color: var(--text-secondary, #b3b3b3);
}

.settings-item-warning {
	background: var(--bg-warning, rgba(233, 0, 63, 0.1));
	border-color: var(--secondary, #e9003f);
	align-items: center;
	justify-content: space-between;
	flex-wrap: wrap;
}

.settings-warning-content {
	display: flex;
	align-items: center;
	gap: 12px;
	flex: 1;
	min-width: 0;
}

.settings-warning-icon {
	width: 24px;
	height: 24px;
	flex-shrink: 0;
	color: var(--secondary, #e9003f);
}

.settings-warning-text {
	display: flex;
	flex-direction: column;
	gap: 4px;
	flex: 1;
	min-width: 0;
}

.settings-warning-title {
	font-size: 14px;
	font-weight: 600;
	color: var(--text, #fff);
}

.settings-warning-description {
	font-size: 12px;
	color: var(--text-secondary, #b3b3b3);
	line-height: 1.4;
}

.settings-button-secondary {
	background: var(--bg-tertiary, #2a2a2a);
	border: 1px solid var(--border, #3a3a3a);
	color: var(--text, #fff);
	flex-shrink: 0;
}
</style>
