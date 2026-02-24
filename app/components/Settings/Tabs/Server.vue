<template>
	<div class="settings-tab-server">
		<div class="settings-section">
			<h2 class="section-title">{{ getString("settings.server.title") }}</h2>
			<div class="settings-items">
				<div class="settings-item">
					<SettingsCheckbox
						:checked="settings.server.enable"
						@update="updateServerEnable"
					>
						{{ getString("settings.server.enable") }}
					</SettingsCheckbox>
				</div>

				<div v-if="settings.server.enable" class="settings-item">
					<label class="settings-label settings-label-block">{{ getString("settings.server.password") }}</label>
					<div class="settings-input-group">
						<input
							:value="settings.server.passwordHash ? getString('settings.server.passwordSet') : ''"
							type="password"
							readonly
							tabindex="-1"
							autocomplete="off"
							class="settings-input settings-input-readonly"
							:placeholder="getString('settings.server.passwordPlaceholder')"
						/>
						<button
							type="button"
							@click="generatePassword"
							:disabled="generating"
							class="settings-button"
						>
							<Icon
								v-if="generating"
								name="mdi:loading"
								class="settings-button-icon spinning"
							/>
							{{ generating ? getString("settings.server.generating") : getString("settings.server.generatePassword") }}
						</button>
					</div>
				</div>

				<div v-if="settings.server.enable" class="settings-item">
					<h3 class="settings-label settings-label-block">{{ getString("settings.server.endpointsTitle") }}</h3>
					<SettingsServerEndpoints
						ref="endpointsRef"
						:endpoints="serverEndpoints"
					/>
				</div>

				<div v-if="settings.server.enable" class="settings-item">
					<h3 class="settings-label settings-label-block">{{ getString("settings.server.connectedClientsTitle") }}</h3>
					<div class="settings-connected-clients">
						<div v-if="connectedClients.length === 0" class="settings-connected-clients-empty">
							{{ getString("settings.server.connectedClientsEmpty") }}
						</div>
						<ul v-else class="settings-connected-clients-list">
							<li
								v-for="client in connectedClients"
								:key="client.id"
								class="settings-connected-clients-item"
							>
								<span class="settings-connected-clients-ip">{{ client.ip }}</span>
								<span class="settings-connected-clients-time">{{ formatConnectedAt(client.connectedAt) }}</span>
							</li>
						</ul>
						<button
							type="button"
							class="settings-button settings-button-secondary"
							:disabled="loadingClients"
							@click="fetchConnectedClients"
						>
							<Icon v-if="loadingClients" name="mdi:loading" class="settings-button-icon spinning" />
							{{ loadingClients ? getString("settings.server.resultChecking") : getString("settings.server.connectedClientsRefresh") }}
						</button>
					</div>
				</div>
			</div>
		</div>

		<div v-if="generatedPassword !== null" class="settings-password-modal-overlay" @click.self="closePasswordModal">
			<div class="settings-password-modal">
				<p class="settings-password-modal-warning">{{ getString("settings.server.passwordGeneratedOnce") }}</p>
				<div class="settings-password-modal-value">{{ generatedPassword }}</div>
				<div class="settings-input-group">
					<button type="button" @click="copyPassword" class="settings-button settings-button-primary">
						<Icon name="mdi:content-copy" class="settings-button-icon" />
						{{ getString("settings.server.copy") }}
					</button>
					<button type="button" @click="closePasswordModal" class="settings-button">{{ getString("settings.server.resultOk") }}</button>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";

import SettingsServerEndpoints from "~/components/Settings/ServerEndpoints.vue";
import type { ServerEndpointItem } from "~/components/Settings/ServerEndpoints.vue";

import { useSettingsStore } from "~/stores/settings";

const { getString } = useStrings();
const settingsStore = useSettingsStore();
const { settings } = storeToRefs(settingsStore);

const serverEndpoints: Record<string, ServerEndpointItem> = {
	nowPlaying: { method: "GET", path: "/api/streamer/now-playing", labelKey: "settings.server.endpointNowPlaying" },
	playlist: { method: "GET", path: "/api/streamer/playlist", labelKey: "settings.server.endpointPlaylist" },
	wsSong: { method: "WS", path: "/socket/player/song", labelKey: "settings.server.endpointNowPlaying" },
	wsPlaylist: { method: "WS", path: "/socket/player/playlist", labelKey: "settings.server.endpointPlaylist" },
	wsTime: { method: "WS", path: "/socket/player/time", labelKey: "settings.server.endpointTime" }
};

type ConnectedClientEntry = { id: number; type: "song" | "playlist" | "time"; connectedAt: number; ip: string };

const endpointsRef = ref<InstanceType<typeof SettingsServerEndpoints> | null>(null);
const generatedPassword = ref<string | null>(null);
const generating = ref(false);
const connectedClients = ref<ConnectedClientEntry[]>([]);
const loadingClients = ref(false);

function formatConnectedAt(timestamp: number): string {
	const diffMs = Date.now() - timestamp;
	if (diffMs < 60000) return Math.floor(diffMs / 1000) + " s";
	if (diffMs < 3600000) return Math.floor(diffMs / 60000) + " min";
	return new Date(timestamp).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

const fetchConnectedClients = async () => {
	if (loadingClients.value) return;
	loadingClients.value = true;
	const list = await $fetch<ConnectedClientEntry[]>("/api/settings/server-clients").catch(() => []);
	loadingClients.value = false;
	connectedClients.value = list;
};

const updateServerEnable = (checked: boolean) => {
	settingsStore.updateSection("server", {
		...settings.value.server,
		enable: checked
	});

	if (checked) {
		nextTick(() => endpointsRef.value?.checkEndpoints());
	}
};

const generatePassword = async () => {
	if (generating.value) return;

	generating.value = true;
	generatedPassword.value = null;

	const res = await $fetch<{ password: string }>("/api/settings/server-password/generate", { method: "POST" }).catch(() => null);

	generating.value = false;

	if (res?.password) {
		generatedPassword.value = res.password;
		await settingsStore.refresh();
	}
};

const copyPassword = () => {
	const text = generatedPassword.value;
	if (!text) return;

	if (navigator.clipboard?.writeText) {
		navigator.clipboard.writeText(text).catch(() => {
			fallbackCopy(text);
		});
		return;
	}

	fallbackCopy(text);
};

function fallbackCopy(text: string) {
	if (!import.meta.client || typeof document === "undefined") return;

	const textarea = document.createElement("textarea");
	textarea.value = text;
	textarea.style.position = "fixed";
	textarea.style.left = "-9999px";
	textarea.style.top = "0";
	document.body.appendChild(textarea);
	textarea.focus();
	textarea.select();
	document.execCommand("copy");
	document.body.removeChild(textarea);
}

const closePasswordModal = () => {
	generatedPassword.value = null;
};

onMounted(() => {
	if (settings.value.server.enable) {
		nextTick(() => endpointsRef.value?.checkEndpoints());
		fetchConnectedClients();
	}
});
</script>

<style scoped lang="scss">
.settings-tab-server {
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
	flex-direction: column;
	gap: 8px;
}

.settings-label {
	font-size: 14px;
	font-weight: 500;
	color: var(--text, #fff);
}

.settings-label-block {
	display: block;
	margin-bottom: 6px;
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

.settings-input-readonly {
	cursor: default;
	user-select: none;
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

.settings-password-modal-overlay {
	position: fixed;
	inset: 0;
	background: rgba(0, 0, 0, 0.6);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 1000;
}

.settings-password-modal {
	background: var(--bg-secondary, #1a1a1a);
	border: 1px solid var(--border, #3a3a3a);
	border-radius: 12px;
	padding: 24px;
	max-width: 400px;
	width: 90%;
}

.settings-password-modal-warning {
	margin: 0 0 12px 0;
	font-size: 13px;
	color: var(--text-secondary, #b3b3b3);
}

.settings-password-modal-value {
	margin: 0 0 16px 0;
	padding: 12px;
	background: var(--bg-tertiary, #2a2a2a);
	border-radius: 6px;
	font-family: monospace;
	font-size: 14px;
	word-break: break-all;
	color: var(--text, #fff);
}

.settings-connected-clients {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.settings-connected-clients-empty {
	font-size: 14px;
	color: var(--text-secondary, #b3b3b3);
	padding: 12px 0;
}

.settings-connected-clients-list {
	margin: 0;
	padding: 0;
	list-style: none;
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.settings-connected-clients-item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	padding: 10px 14px;
	background: var(--bg-tertiary, #2a2a2a);
	border: 1px solid var(--border, #3a3a3a);
	border-radius: 6px;
	font-size: 14px;
}

.settings-connected-clients-ip {
	font-weight: 500;
	color: var(--text, #fff);
	font-family: ui-monospace, monospace;
}

.settings-connected-clients-time {
	color: var(--text-secondary, #b3b3b3);
	font-size: 13px;
}
</style>
