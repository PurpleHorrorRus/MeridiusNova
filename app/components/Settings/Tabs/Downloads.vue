<template>
	<div class="settings-tab-downloads">
		<div class="settings-section">
			<h2 class="section-title">{{ getString("settings.downloads.ffmpeg.title") }}</h2>
			<div class="settings-items">
				<div v-if="!ffmpegExist" class="settings-item">
					<div class="ffmpeg-status">
						<span>{{ getString("settings.downloads.ffmpeg.notInstalled") }}</span>
						<button @click="installFFmpeg" class="settings-button" :disabled="ffmpegInstalling">
							{{ ffmpegInstalling ? getString("settings.downloads.ffmpeg.installing") : getString("settings.downloads.ffmpeg.install") }}
						</button>
					</div>
				</div>

				<div v-else class="settings-item">
					<div class="ffmpeg-status">
						<span>{{ getString("settings.downloads.ffmpeg.installed") }}</span>
					</div>
				</div>

				<div class="settings-tip" v-text="getString('settings.hints.downloads.ffmpeg')" />
			</div>
		</div>

		<div v-if="ffmpegExist" class="settings-section">
			<h2 class="section-title">{{ getString("settings.downloads.title") }}</h2>
			<div class="settings-items">
				<div class="settings-item">
					<SettingsCheckbox
						:checked="settings.download.enable"
						@update="updateDownloadEnable"
					>
						{{ getString("settings.downloads.enable") }}
					</SettingsCheckbox>
				</div>

				<div v-if="isTauri()" class="settings-item">
					<label class="settings-label">{{ getString("settings.downloads.folder") }}</label>
					<div class="settings-input-group">
						<input
							:value="settings.download.path"
							type="text"
							class="settings-input"
							:placeholder="getString('settings.downloads.folderPlaceholder')"
							readonly
						/>
						<button
							@click="chooseDownloadPath"
							class="settings-button"
						>
							{{ getString("settings.downloads.choose") }}
						</button>
					</div>
				</div>

				<div class="settings-item">
					<label class="settings-label">{{ getString("settings.downloads.template.title") }}</label>
					<input
						:value="settings.download.template"
						@input="updateTemplate"
						type="text"
						class="settings-input"
						:placeholder="templatePlaceholder"
					/>
				</div>

				<div class="settings-tip" v-text="getString('settings.hints.downloads.template')" />

				<div class="settings-tip">
					{{ getString("settings.downloads.template.headers") }}: {{ headers }}
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { useFFmpegStore } from "~/stores/ffmpeg";

import { isTauri } from "~/utils/tauri";

const { getString } = useStrings();
const ffmpegStore = useFFmpegStore();
const settingsStore = useSettingsStore();
const { settings } = storeToRefs(settingsStore);
const ffmpegExist = computed(() => ffmpegStore.exist);
const ffmpegInstalling = computed(() => ffmpegStore.downloading);


const headers = "{{ index }}, {{ performer }}, {{ title }}, {{ id }}, {{ owner }}";
const templatePlaceholder = "{{ performer }} - {{ title }}";

onMounted(async () => {
	await ffmpegStore.check();
});

const installFFmpeg = async () => {
	await ffmpegStore.install();
};

const updateDownloadEnable = (checked: boolean) => {
	settingsStore.updateSection("download", { enable: checked });
};

const chooseDownloadPath = async () => {
	if (isTauri() && import.meta.client) {
		const { open } = await import("@tauri-apps/plugin-dialog");
		const selected = await open({
			directory: true,
			multiple: false
		});

		if (selected && typeof selected === "string") {
			settingsStore.updateSection("download", { path: selected });
		}
	}
};

const updateTemplate = (event: Event) => {
	const target = event.target as HTMLInputElement;
	settingsStore.updateSection("download", { template: target.value });
};
</script>

<style scoped lang="scss">
.settings-tab-downloads {
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
	min-width: 0;
	max-width: 100%;
	box-sizing: border-box;

	@media (max-width: 768px) {
		width: 100%;
	}
	color: var(--text, #fff);
	font-size: 14px;
	font-weight: 500;
	outline: none;
	transition: all 0.2s ease;

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

	&:active:not(:disabled) {
		transform: translateY(0);
	}

	&:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
}

.ffmpeg-status {
	display: flex;
	align-items: center;
	justify-content: space-between;
	width: 100%;
	gap: 16px;
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
