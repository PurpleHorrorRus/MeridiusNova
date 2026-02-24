<template>
	<div class="settings-section">
		<h2 class="section-title">{{ getString("settings.equalizer.title") }}</h2>
		<div class="settings-items">
			<div class="settings-item">
				<SettingsCheckbox
					:checked="enabled"
					@update="handleEnableChange"
				>
					{{ getString("settings.equalizer.enable") }}
				</SettingsCheckbox>
			</div>

			<div class="settings-item">
				<label class="settings-label">{{ getString("settings.equalizer.presets") }}</label>
				<select
					:value="selectedPresetIndex"
					@change="handlePresetChange"
					class="settings-select"
				>
					<option
						v-for="(preset, index) in presets"
						:key="index"
						:value="index"
					>
						{{ preset.title }}
					</option>
				</select>
			</div>

			<div class="settings-item">
				<div class="equalizer-actions">
					<button @click="handleExport" class="settings-button">
						{{ getString("settings.equalizer.export") }}
					</button>
					<button @click="handleImport" class="settings-button">
						{{ getString("settings.equalizer.import") }}
					</button>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { EqualizerPreset } from "./EqualizerPresets";

interface Props {
	enabled: boolean;
	presets: EqualizerPreset[];
	selectedPresetIndex: number;
	currentLevels: number[];
}

interface Emits {
	(e: "update:enabled", value: boolean): void;
	(e: "preset-change", index: number): void;
	(e: "export"): void;
	(e: "import"): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const { getString } = useStrings();

const handleEnableChange = (checked: boolean) => {
	emit("update:enabled", checked);
};

const handlePresetChange = (event: Event) => {
	const target = event.target as HTMLSelectElement;
	const index = parseInt(target.value);
	emit("preset-change", index);
};

const handleExport = () => {
	emit("export");
};

const handleImport = () => {
	emit("import");
};
</script>

<style scoped lang="scss">
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

	&:focus {
		border-color: var(--secondary, #e9003f);
		box-shadow: 0 0 0 3px rgba(233, 0, 63, 0.1);
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

	&:active {
		transform: translateY(0);
	}
}

.equalizer-actions {
	display: flex;
	gap: 10px;
}
</style>


