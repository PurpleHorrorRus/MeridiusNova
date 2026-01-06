<template>
	<div class="settings-tab-player">
		<div v-if="isTauri()" class="settings-section">
			<h2 class="section-title">{{ getString("settings.player.audioOutput") }}</h2>
			<div class="settings-items">
				<div class="settings-item">
					<label class="settings-label">{{ getString("settings.player.audioOutput") }}</label>
					<select
						:value="outputDeviceIndex"
						@change="changeOutputDevice"
						class="settings-select"
						:disabled="outputDevices.length === 0"
					>
						<option
							v-if="outputDevices.length === 0"
							:value="0"
						>
							{{ getString("settings.player.audioOutput.noDevices") || "Нет доступных устройств" }}
						</option>
						<option
							v-for="(device, index) in outputDevices"
							v-else
							:key="device.deviceId"
							:value="index"
						>
							{{ device.label || `Устройство ${index + 1}` }}
						</option>
					</select>
				</div>
			</div>
		</div>

		<div class="settings-section">
			<h2 class="section-title">{{ getString("settings.player.volume.title") }}</h2>
			<div class="settings-items">
				<div class="settings-item">
					<label class="settings-label">
						{{ getString("settings.player.volume.divider") }}
						<span class="settings-value">{{ settings.player.volumeDivider }}</span>
					</label>
					<input
						type="range"
						:value="settings.player.volumeDivider"
						@input="updateVolumeDivider"
						min="1"
						max="20"
						step="0.25"
						class="settings-range"
					/>
				</div>

				<div v-if="volumeDividerHint" class="settings-tip">
					{{ volumeDividerHint }}
				</div>
			</div>
		</div>

		<div class="settings-section">
			<h2 class="section-title">{{ getString("settings.player.latest.title") }}</h2>
			<div class="settings-items">
				<div class="settings-item">
					<label class="settings-label">
						<input
							type="checkbox"
							:checked="settings.player.latest.save"
							@change="updateLatestSave"
							class="settings-checkbox"
						/>
						{{ getString("settings.player.latest.save") }}
					</label>
				</div>

				<div v-if="settings.player.latest.save" class="settings-item">
					<label class="settings-label">
						<input
							type="checkbox"
							:checked="settings.player.latest.exit"
							@change="updateLatestExit"
							class="settings-checkbox"
						/>
						{{ getString("settings.player.latest.exit") }}
					</label>
				</div>

				<div v-if="settings.player.latest.save" class="settings-item">
					<label class="settings-label">
						<input
							type="checkbox"
							:checked="settings.player.latest.play"
							@change="updateLatestPlay"
							class="settings-checkbox"
						/>
						{{ getString("settings.player.latest.play") }}
					</label>
				</div>
			</div>
		</div>

		<div class="settings-section">
			<h2 class="section-title">{{ getString("settings.player.rewind.title") }}</h2>
			<div class="settings-items">
				<div class="settings-item">
					<label class="settings-label">
						<input
							type="checkbox"
							:checked="settings.player.rewind"
							@change="updateRewind"
							class="settings-checkbox"
						/>
						{{ getString("settings.player.rewind.enable") }}
					</label>
				</div>

				<div v-if="rewindHint" class="settings-tip">
					{{ rewindHint }}
				</div>
			</div>
		</div>

		<div class="settings-section">
			<h2 class="section-title">{{ getString("settings.player.normalizer.title") }}</h2>
			<div class="settings-items">
				<div class="settings-item">
					<label class="settings-label">
						<input
							type="checkbox"
							:checked="settings.player.normalizer.enable"
							@change="updateNormalizerEnable"
							class="settings-checkbox"
						/>
						{{ getString("settings.player.normalizer.enable") }}
					</label>
				</div>

				<div v-if="normalizerTipHint" class="settings-tip">
					{{ normalizerTipHint }}
				</div>

				<div v-if="settings.player.normalizer.enable" class="settings-item">
					<label class="settings-label">
						{{ getString("settings.player.normalizer.max") }}
						<span class="settings-value">{{ settings.player.normalizer.max }} дБ</span>
					</label>
					<input
						type="range"
						:value="settings.player.normalizer.max"
						@input="updateNormalizerMax"
						min="1"
						max="20"
						step="0.5"
						class="settings-range"
					/>
				</div>

				<div v-if="normalizerMaxHint" class="settings-tip">
					{{ normalizerMaxHint }}
				</div>
			</div>
		</div>

		<div class="settings-section">
			<h2 class="section-title">{{ getString("settings.player.crossfade.title") }}</h2>
			<div class="settings-items">
				<div class="settings-item">
					<label class="settings-label">
						<input
							type="checkbox"
							:checked="settings.player.crossfade.enable"
							@change="updateCrossfadeEnable"
							class="settings-checkbox"
						/>
						{{ getString("settings.player.crossfade.enable") }}
					</label>
				</div>

				<div v-if="settings.player.crossfade.enable" class="settings-item">
					<label class="settings-label">
						{{ getString("settings.player.crossfade.duration") }}
						<span class="settings-value">{{ settings.player.crossfade.duration }} сек</span>
					</label>
					<input
						type="range"
						:value="settings.player.crossfade.duration"
						@input="updateCrossfadeDuration"
						min="2"
						max="16"
						step="1"
						class="settings-range"
					/>
				</div>

				<div v-if="settings.player.crossfade.enable" class="settings-item">
					<label class="settings-label">
						<input
							type="checkbox"
							:checked="settings.player.crossfade.fade"
							@change="updateCrossfadeFade"
							class="settings-checkbox"
						/>
						{{ getString("settings.player.crossfade.fade") }}
					</label>
				</div>
			</div>
		</div>

		<div v-if="isTauri()" class="settings-section">
			<h2 class="section-title">{{ getString("settings.player.step.title") }}</h2>
			<div class="settings-items">
				<div class="settings-item">
					<label class="settings-label">
						{{ getString("settings.player.step.wheel") }}
						<span class="settings-value">{{ settings.player.step.wheel }}%</span>
					</label>
					<input
						type="range"
						:value="settings.player.step.wheel"
						@input="updateStepWheel"
						min="1"
						max="30"
						step="1"
						class="settings-range"
					/>
				</div>

				<div class="settings-item">
					<label class="settings-label">
						{{ getString("settings.player.step.hotkey") }}
						<span class="settings-value">{{ settings.player.step.hotkey }}%</span>
					</label>
					<input
						type="range"
						:value="settings.player.step.hotkey"
						@input="updateStepHotkey"
						min="1"
						max="30"
						step="1"
						class="settings-range"
					/>
				</div>
			</div>
		</div>

		<div class="settings-section">
			<h2 class="section-title">{{ getString("settings.player.playbackRateStep.title") }}</h2>
			<div class="settings-items">
				<div class="settings-item">
					<label class="settings-label">
						{{ getString("settings.player.playbackRateStep.click") }}
						<span class="settings-value">{{ settings.player.playbackRateStep.click }}</span>
					</label>
					<input
						type="range"
						:value="settings.player.playbackRateStep.click"
						@input="updatePlaybackRateStepClick"
						min="0.05"
						max="1"
						step="0.05"
						class="settings-range"
					/>
				</div>

				<div class="settings-item">
					<label class="settings-label">
						{{ getString("settings.player.playbackRateStep.wheel") }}
						<span class="settings-value">{{ settings.player.playbackRateStep.wheel }}</span>
					</label>
					<input
						type="range"
						:value="settings.player.playbackRateStep.wheel"
						@input="updatePlaybackRateStepWheel"
						min="0.05"
						max="1"
						step="0.05"
						class="settings-range"
					/>
				</div>

				<div class="settings-item">
					<label class="settings-label">
						{{ getString("settings.player.playbackRateStep.hotkey") }}
						<span class="settings-value">{{ settings.player.playbackRateStep.hotkey }}</span>
					</label>
					<input
						type="range"
						:value="settings.player.playbackRateStep.hotkey"
						@input="updatePlaybackRateStepHotkey"
						min="0.05"
						max="1"
						step="0.05"
						class="settings-range"
					/>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { usePlayerStore } from "~/stores/player";
import { useSettingsStore } from "~/stores/settings";

import { isTauri } from "~/utils/tauri";

import { storeToRefs } from "pinia";

const { getString, i18n } = useStrings();
const settingsStore = useSettingsStore();
const { settings } = storeToRefs(settingsStore);
const playerStore = usePlayerStore();

interface AudioDevice {
	deviceId: string;
	label: string;
}

const outputDevices = ref<AudioDevice[]>([]);
const outputDeviceIndex = ref(0);

const lang = computed(() => settings.value.general.lang as "ru" | "en");
const volumeDividerHint = computed(() => settings.value.settingHints[lang.value]?.player?.volumeDivider);
const rewindHint = computed(() => {
	const hint = settings.value.settingHints[lang.value]?.player?.rewind;
	if (hint) {
		const rewindValue = 5;
		return i18n(hint, { rewind: rewindValue });
	}
	return hint;
});
const normalizerTipHint = computed(() => settings.value.settingHints[lang.value]?.player?.normalizer?.tip);
const normalizerMaxHint = computed(() => settings.value.settingHints[lang.value]?.player?.normalizer?.max);

const loadDevices = async () => {
	if (!import.meta.client) {
		return;
	}

	if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
		console.error("MediaDevices API is not supported");
		return;
	}

	const devices = await navigator.mediaDevices.enumerateDevices().catch((error: Error) => {
		console.error("Failed to get audio devices:", error);
		return null;
	});

	if (!devices) {
		outputDevices.value = [{
			deviceId: "default",
			label: "Устройство по умолчанию"
		}];
		return;
	}

	const audioOutputDevices: AudioDevice[] = devices
		.filter(deviceItem => deviceItem.kind === "audiooutput")
		.map(deviceItem => ({
			deviceId: deviceItem.deviceId,
			label: deviceItem.label || `Устройство ${deviceItem.deviceId.slice(0, 8)}`
		}));

	audioOutputDevices.unshift({
		deviceId: "default",
		label: "Устройство по умолчанию"
	});

	outputDevices.value = audioOutputDevices;
	
	const currentDevice = settings.value.player.output;
	const index = outputDevices.value.findIndex(deviceItem => deviceItem.deviceId === currentDevice);
	outputDeviceIndex.value = index >= 0 ? index : 0;
};

onMounted(() => {
	loadDevices();
});

const changeOutputDevice = async (event: Event) => {
	const target = event.target as HTMLSelectElement;
	const index = parseInt(target.value);
	const device = outputDevices.value[index];
	
	if (device) {
		settingsStore.updateSection("player", { output: device.deviceId });
		outputDeviceIndex.value = index;
		
		const controller = playerStore.currentController;
		if (controller?.controller && "setSinkId" in controller.controller) {
			await (controller.controller as HTMLAudioElement & { setSinkId: (id: string) => Promise<void> })
				.setSinkId(device.deviceId)
				.catch(() => {
					console.error("Failed to set output device");
				});
		}
	}
};

const updateVolumeDivider = (event: Event) => {
	const target = event.target as HTMLInputElement;
	const value = parseFloat(target.value);
	settingsStore.updateSection("player", { volumeDivider: value });
	
	// Пересчитываем громкость с новым делителем
	playerStore.setVolume(playerStore.volume);
};

const updateLatestSave = (event: Event) => {
	const target = event.target as HTMLInputElement;
	settingsStore.updateSection("player", {
		latest: {
			...settings.value.player.latest,
			save: target.checked
		}
	});
};

const updateLatestExit = (event: Event) => {
	const target = event.target as HTMLInputElement;
	settingsStore.updateSection("player", {
		latest: {
			...settings.value.player.latest,
			exit: target.checked
		}
	});
};

const updateLatestPlay = (event: Event) => {
	const target = event.target as HTMLInputElement;
	settingsStore.updateSection("player", {
		latest: {
			...settings.value.player.latest,
			play: target.checked
		}
	});
};

const updateRewind = (event: Event) => {
	const target = event.target as HTMLInputElement;
	settingsStore.updateSection("player", { rewind: target.checked });
};

const updateNormalizerEnable = (event: Event) => {
	const target = event.target as HTMLInputElement;
	settingsStore.updateSection("player", {
		normalizer: {
			...settings.value.player.normalizer,
			enable: target.checked
		}
	});
};

const updateNormalizerMax = (event: Event) => {
	const target = event.target as HTMLInputElement;
	const value = parseFloat(target.value);
	settingsStore.updateSection("player", {
		normalizer: {
			...settings.value.player.normalizer,
			max: value
		}
	});
};

const updateCrossfadeEnable = (event: Event) => {
	const target = event.target as HTMLInputElement;
	settingsStore.updateSection("player", {
		crossfade: {
			...settings.value.player.crossfade,
			enable: target.checked
		}
	});
};

const updateCrossfadeDuration = (event: Event) => {
	const target = event.target as HTMLInputElement;
	const value = parseInt(target.value);
	settingsStore.updateSection("player", {
		crossfade: {
			...settings.value.player.crossfade,
			duration: value
		}
	});

	// Обновляем длительность в активных экземплярах crossfade
	const currentController = playerStore.currentController;
	const opposedController = playerStore.opposedController;

	if (currentController?.crossfadeInstance) {
		currentController.crossfadeInstance.setDuration(value);
	}

	if (opposedController?.crossfadeInstance) {
		opposedController.crossfadeInstance.setDuration(value);
	}
};

const updateCrossfadeFade = (event: Event) => {
	const target = event.target as HTMLInputElement;
	settingsStore.updateSection("player", {
		crossfade: {
			...settings.value.player.crossfade,
			fade: target.checked
		}
	});
};

const updateStepWheel = (event: Event) => {
	const target = event.target as HTMLInputElement;
	const value = parseInt(target.value);
	settingsStore.updateSection("player", {
		step: {
			...settings.value.player.step,
			wheel: value
		}
	});
};

const updateStepHotkey = (event: Event) => {
	const target = event.target as HTMLInputElement;
	const value = parseInt(target.value);
	settingsStore.updateSection("player", {
		step: {
			...settings.value.player.step,
			hotkey: value
		}
	});
};

const updatePlaybackRateStepClick = (event: Event) => {
	const target = event.target as HTMLInputElement;
	const value = parseFloat(target.value);
	settingsStore.updateSection("player", {
		playbackRateStep: {
			...settings.value.player.playbackRateStep,
			click: value
		}
	});
};

const updatePlaybackRateStepWheel = (event: Event) => {
	const target = event.target as HTMLInputElement;
	const value = parseFloat(target.value);
	settingsStore.updateSection("player", {
		playbackRateStep: {
			...settings.value.player.playbackRateStep,
			wheel: value
		}
	});
};

const updatePlaybackRateStepHotkey = (event: Event) => {
	const target = event.target as HTMLInputElement;
	const value = parseFloat(target.value);
	settingsStore.updateSection("player", {
		playbackRateStep: {
			...settings.value.player.playbackRateStep,
			hotkey: value
		}
	});
};
</script>

<style scoped lang="scss">
.settings-tab-player {
	display: flex;
	flex-direction: column;
	gap: 40px;

	@media (max-width: 800px) {
		.settings-section:first-child {
			.settings-items {
				.settings-item:first-child {
					border-radius: 12px 12px 10px 10px;
				}
			}
		}
	}

	@media (max-width: 600px) {
		.settings-section:first-child {
			.settings-items {
				.settings-item:first-child {
					border-radius: 10px 10px 8px 8px;
				}
			}
		}
	}
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
	padding: 24px;
	background: var(--bg-secondary, #1a1a1a);
	border: 1px solid var(--border, #282828);
	border-radius: 10px;
	transition: all 0.2s ease;
	box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	min-height: 60px;
	max-width: 100%;
	box-sizing: border-box;

	@media (max-width: 1024px) {
		padding: 20px;
		gap: 12px;
	}

	@media (max-width: 768px) {
		flex-wrap: wrap;
		padding: 16px;
		gap: 12px;
	}

	@media (max-width: 600px) {
		padding: 14px;
		gap: 10px;
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
	transition: all 0.2s ease;

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
		transition: all 0.2s ease;
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
