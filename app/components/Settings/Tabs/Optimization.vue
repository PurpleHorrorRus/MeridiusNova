<template>
	<div class="settings-tab-optimization">
		<div class="settings-section">
			<h2 class="section-title">{{ getString("settings.optimization.title") }}</h2>
			<div class="settings-items">
				<div v-if="isTauri()" class="settings-item">
					<label class="settings-label">
						<input
							type="checkbox"
							:checked="settings.window.hardwareAcceleration"
							@change="updateHardwareAcceleration"
							class="settings-checkbox"
						/>
						{{ getString("settings.optimization.hardwareAcceleration") }}
					</label>
				</div>

				<div v-if="isTauri() && hardwareAccelerationHint" class="settings-tip">
					{{ hardwareAccelerationHint }}
				</div>

				<div class="settings-item">
					<label class="settings-label">
						<input
							type="checkbox"
							:checked="settings.optimization.download.auto"
							@change="updateAutoDownloads"
							class="settings-checkbox"
						/>
						{{ getString("settings.optimization.download.auto") }}
						<span v-if="settings.optimization.download.auto" class="settings-value">
							({{ autoDownloadCount }})
						</span>
					</label>
				</div>

				<div v-if="downloadAutoHint" class="settings-tip">
					{{ downloadAutoHint }}
				</div>

				<div v-if="!settings.optimization.download.auto" class="settings-item">
					<label class="settings-label">
						{{ getString("settings.optimization.download.fixed") }}
						<span class="settings-value">{{ settings.optimization.download.fixed }}</span>
					</label>
					<input
						type="range"
						:value="settings.optimization.download.fixed"
						@input="updateFixedDownloads"
						min="1"
						max="10"
						step="1"
						class="settings-range"
					/>
				</div>

				<div v-if="downloadFixedHint" class="settings-tip">
					{{ downloadFixedHint }}
				</div>
			</div>
		</div>

		<div v-if="!isTauri()" class="settings-section">
			<h2 class="section-title">{{ getString("settings.downloads.title") }}</h2>
			<div class="settings-items">
				<div class="settings-item">
					<label class="settings-label">
						<input
							type="checkbox"
							:checked="settings.download.enable"
							@change="updateDownloadEnable"
							class="settings-checkbox"
						/>
						{{ getString("settings.downloads.enable") }}
					</label>
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

				<div v-if="templateHint" class="settings-tip">
					{{ templateHint }}
				</div>

				<div class="settings-tip">
					{{ getString("settings.downloads.template.headers") }}: {{ headers }}
				</div>

				<div class="settings-tip settings-info">
					{{ getString("settings.downloads.mobile.note") || "На мобильных устройствах файлы скачиваются в папку загрузок браузера. Выбор папки недоступен." }}
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { isTauri } from "~/utils/tauri";

const { getString } = useStrings();
const settingsStore = useSettingsStore();
const { settings } = storeToRefs(settingsStore);

const lang = computed(() => settings.value.general.lang as "ru" | "en");
const hardwareAccelerationHint = computed(() => settings.value.settingHints[lang.value]?.optimization?.hardwareAcceleration);
const downloadAutoHint = computed(() => settings.value.settingHints[lang.value]?.optimization?.download?.auto);
const downloadFixedHint = computed(() => settings.value.settingHints[lang.value]?.optimization?.download?.fixed);
const templateHint = computed(() => settings.value.settingHints[lang.value]?.downloads?.template);

const autoDownloadCount = computed(() => {
	if (import.meta.client && typeof navigator !== "undefined" && navigator.hardwareConcurrency) {
		return Math.round(navigator.hardwareConcurrency / 2);
	}
	return 2;
});

const headers = "{{ index }}, {{ performer }}, {{ title }}, {{ id }}, {{ owner }}";
const templatePlaceholder = "{{ performer }} - {{ title }}";

const updateHardwareAcceleration = (event: Event) => {
	const target = event.target as HTMLInputElement;
	settingsStore.updateSection("window", { hardwareAcceleration: target.checked });
};

const updateAutoDownloads = (event: Event) => {
	const target = event.target as HTMLInputElement;
	settingsStore.updateSection("optimization", {
		download: {
			...settings.value.optimization.download,
			auto: target.checked
		}
	});
};

const updateFixedDownloads = (event: Event) => {
	const target = event.target as HTMLInputElement;
	const value = parseInt(target.value);
	settingsStore.updateSection("optimization", {
		download: {
			...settings.value.optimization.download,
			fixed: value
		}
	});
};

const updateDownloadEnable = (event: Event) => {
	const target = event.target as HTMLInputElement;
	settingsStore.updateSection("download", { enable: target.checked });
};

const updateTemplate = (event: Event) => {
	const target = event.target as HTMLInputElement;
	settingsStore.updateSection("download", { template: target.value });
};
</script>

<style scoped lang="scss">
.settings-tab-optimization {
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
	transition: background-color 0.2s ease, border-color 0.2s ease;
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

.settings-range {
	flex: 1;
	height: 6px;
	background: var(--bg-tertiary, #535353);
	border-radius: 3px;
	outline: none;
	cursor: pointer;

	&:hover {
		height: 8px;
	}

	&::-webkit-slider-thumb {
		appearance: none;
		width: 16px;
		height: 16px;
		background: var(--secondary, #e9003f);
		border-radius: 50%;
		cursor: pointer;
		transition: transform 0.2s ease;
		box-shadow: 0 2px 4px rgba(233, 0, 63, 0.3);
	}

	&::-webkit-slider-thumb:hover {
		transform: scale(1.2);
		box-shadow: 0 4px 8px rgba(233, 0, 63, 0.4);
	}
}

.settings-value {
	min-width: 60px;
	text-align: right;
	font-size: 14px;
	font-weight: 600;
	color: var(--text-secondary, #b3b3b3);
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

.settings-info {
	border-left-color: var(--text-secondary, #b3b3b3);
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
	color: var(--text, #fff);
	font-size: 14px;
	font-weight: 500;
	outline: none;
	transition: background-color 0.2s ease, border-color 0.2s ease;

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
</style>
