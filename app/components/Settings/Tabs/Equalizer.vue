<template>
	<div class="settings-tab-equalizer">
		<EqualizerSettings
			:enabled="settings.equalizer.enable"
			:presets="presets"
			:selected-preset-index="selectedPresetIndex"
			:current-levels="settings.equalizer.levels"
			@update:enabled="updateEqualizerEnable"
			@preset-change="changePreset"
			@export="exportPreset"
			@import="importPreset"
		/>

		<EqualizerGraph
			:levels="settings.equalizer.levels"
			@update-level="updateLevel"
		/>
	</div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from "vue";
import { useEqualizerStore } from "~/stores/equalizer";
import { storeToRefs } from "pinia";
import { useSettingsStore } from "~/stores/settings";
import { useSpectrumAnalyzer } from "~/composables/useSpectrumAnalyzer";
import { EQUALIZER_PRESETS } from "./EqualizerPresets";
import EqualizerSettings from "./EqualizerSettings.vue";
import EqualizerGraph from "./EqualizerGraph.vue";

const equalizerStore = useEqualizerStore();
const settingsStore = useSettingsStore();
const { settings } = storeToRefs(settingsStore);
const { connect: connectSpectrumAnalyzer, disconnect: disconnectSpectrumAnalyzer } = useSpectrumAnalyzer();
const presets = ref(EQUALIZER_PRESETS);
const selectedPresetIndex = ref(0);

watch(() => settings.value.equalizer.levels, () => {
	findPreset();
}, { deep: true });

onMounted(() => {
	findPreset();
	connectSpectrumAnalyzer();
});

onUnmounted(() => {
	disconnectSpectrumAnalyzer();
});

const findPreset = () => {
	const currentLevels = settings.value.equalizer.levels;
	const index = presets.value.findIndex(preset => {
		return JSON.stringify(preset.levels) === JSON.stringify(currentLevels);
	});
	selectedPresetIndex.value = index >= 0 ? index : 0;
};

const changePreset = (index: number) => {
	const preset = presets.value[index];

	if (preset) {
		settingsStore.updateSection("equalizer", { levels: [...preset.levels] });
		selectedPresetIndex.value = index;
		equalizerStore.setLevels(preset.levels);
	}
};

const updateLevel = (index: number, value: number) => {
	const clampedValue = Math.max(-15, Math.min(15, value));
	const newLevels = [...settings.value.equalizer.levels];
	newLevels[index] = clampedValue;
	settingsStore.updateSection("equalizer", { levels: newLevels });
	equalizerStore.setLevel(index, clampedValue);
};

const updateEqualizerEnable = (enabled: boolean) => {
	settingsStore.updateSection("equalizer", { enable: enabled });
	equalizerStore.setEnabled(enabled);
};

const exportPreset = () => {
	const preset = {
		title: "Custom",
		levels: settings.value.equalizer.levels
	};
	const dataStr = JSON.stringify(preset, null, 2);
	const dataBlob = new Blob([dataStr], { type: "application/json" });
	const url = URL.createObjectURL(dataBlob);
	const link = document.createElement("a");
	link.href = url;
	link.download = "equalizer-preset.json";
	link.click();
	URL.revokeObjectURL(url);
};

const importPreset = () => {
	const input = document.createElement("input");
	input.type = "file";
	input.accept = "application/json";
	input.onchange = (event: Event) => {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		if (file) {
			const reader = new FileReader();
			reader.onload = (e: ProgressEvent<FileReader>) => {
				const content = e.target?.result as string;
				const preset = JSON.parse(content);
				if (preset.levels && Array.isArray(preset.levels) && preset.levels.length === 18) {
					settingsStore.updateSection("equalizer", { levels: preset.levels });
					equalizerStore.setLevels(preset.levels);
				}
			};
			reader.readAsText(file);
		}
	};
	input.click();
};
</script>

<style scoped lang="scss">
.settings-tab-equalizer {
	display: flex;
	flex-direction: column;
	gap: 40px;
}
</style>
