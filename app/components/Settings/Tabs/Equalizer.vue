<template>
	<div class="settings-tab-equalizer">
		<div class="settings-section">
			<h2 class="section-title">{{ getString("settings.equalizer.title") }}</h2>
			<div class="settings-items">
				<div class="settings-item">
					<label class="settings-label">
						<input
							type="checkbox"
							:checked="settings.equalizer.enable"
							@change="updateEqualizerEnable"
							class="settings-checkbox"
						/>
						{{ getString("settings.equalizer.enable") }}
					</label>
				</div>

				<div class="settings-item">
					<label class="settings-label">{{ getString("settings.equalizer.presets") }}</label>
					<select
						:value="selectedPresetIndex"
						@change="changePreset"
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
						<button @click="exportPreset" class="settings-button">
							{{ getString("settings.equalizer.export") }}
						</button>
						<button @click="importPreset" class="settings-button">
							{{ getString("settings.equalizer.import") }}
						</button>
					</div>
				</div>
			</div>
		</div>

		<div class="settings-section">
			<h2 class="section-title">{{ getString("settings.equalizer.graph") }}</h2>
			<div class="equalizer-graph-container">
				<div class="equalizer-graph-wrapper">
					<canvas
						ref="graphCanvas"
						width="800"
						height="300"
						class="equalizer-canvas"
						@mousedown="handleMouseDown"
						@mousemove="handleMouseMove"
						@mouseup="handleMouseUp"
						@mouseleave="handleMouseLeave"
					/>
					<div
						v-if="tooltip.visible"
						class="equalizer-tooltip"
						:style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }"
					>
						<div class="tooltip-frequency">{{ tooltip.frequency }} Hz</div>
						<div class="tooltip-level">{{ tooltip.level > 0 ? "+" : "" }}{{ tooltip.level.toFixed(1) }} дБ</div>
					</div>
				</div>
				<div class="equalizer-frequencies">
					<div
						v-for="(frequency, index) in frequenciesMap"
						:key="index"
						class="equalizer-frequency-label"
					>
						{{ frequency < 1000 ? frequency : (frequency / 1000).toFixed(1) + "k" }}
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { useEqualizerStore } from "~/stores/equalizer";
import { useEventListener } from "~/composables/useEventListener";

const { getString } = useStrings();

const presetsData = [
	{
		title: "Custom",
		levels: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]
	},
	{
		title: "Alternative",
		levels: [7.4, 6.6, 5.1, 4.2, 2.9, 2.1, 0.8, 0.0, -1.3, -2.1, -0.8, 0.0, 1.3, 2.1, 3.4, 4.2, 5.6, 6.6]
	},
	{
		title: "Ballad",
		levels: [-4.7, -3.2, 0.0, 1.6, 3.2, 3.9, 4.7, 3.9, 3.2, 2.4, 0.0, -1.6, -3.2, -3.2, -3.2, -4.2, 1.6, -4.7]
	},
	{
		title: "Classic",
		levels: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -2.9, -5.8, -5.8, -6.0, -8.1]
	},
	{
		title: "Club",
		levels: [0.0, 0.0, 0.0, 0.9, 1.8, 2.1, 2.4, 3.3, 4.2, 4.5, 3.6, 2.4, 2.1, 1.5, 0.9, 0.0, 0.0, 0.0]
	},
	{
		title: "Dance",
		levels: [9.0, 6.6, 4.8, 2.1, 0.6, 0.0, 0.0, -1.2, -2.1, -2.7, -3.9, -4.2, -4.2, -4.2, -4.5, -4.2, 0.0, 0.0]
	},
	{
		title: "Full Bass",
		levels: [7.4, 7.2, 7.2, 7.2, 5.7, 4.2, 0.9, -0.3, -1.8, -3.0, -4.2, -4.5, -5.1, -6.0, -6.6, -7.2, -8.4, -9.0]
	},
	{
		title: "Full Bass & Treble",
		levels: [7.4, 7.2, 7.2, 6.6, 3.9, 0.0, -6.0, -2.1, -1.5, 0.0, 1.2, 2.1, 4.2, 6.0, 7.8, 8.4, 9.2, 9.2]
	},
	{
		title: "Full Treble",
		levels: [-7.9, -7.9, -7.9, -7.8, -6.6, -6.0, -4.5, -2.4, 0.6, 2.7, 5.1, 8.1, 10.5, 12.3, 12.9, 12.9, 13.1, 12.9]
	},
	{
		title: "Headphones",
		levels: [6.7, 6.7, 6.7, 6.7, 6.6, 4.7, 2.4, -0.5, -2.3, -1.7, -1.2, -0.4, 0.7, 1.6, 2.6, 3.9, 5.5, 9.0]
	},
	{
		title: "Heavy Metal",
		levels: [-2.1, 2.4, 3.9, 3.0, 0.0, -3.9, -4.8, -5.1, -4.8, -4.8, -2.4, -0.9, 0.6, 2.7, 5.7, 6.6, 6.7, 2.5]
	},
	{
		title: "Hip-Hop",
		levels: [5, 4, 2.5, 1.5, 2.1, 2.5, 0.1, -1.5, -1.5, -1.5, 0.1, 1.2, -0.1, -1, 0.8, 2, 2.3, 2.5]
	},
	{
		title: "Industrial",
		levels: [-2.1, -2.4, 0.9, 3, 2.1, 1.5, 0.6, 0, 0, 0, 0, 0, 1.6, 2.7, 5, 6.6, 4.1, 2.5]
	},
	{
		title: "Jazz",
		levels: [3, 6.3, 5.1, 3.6, 1.8, -3.9, -4.8, -5.1, -2.1, 1.2, 4.5, 9, 3, -1.8, -4.5, -2.4, -0.5, 2.5]
	},
	{
		title: "Large Hall",
		levels: [6.7, 6.7, 6.7, 6.7, 6.6, 4.9, 3.6, 3.6, 2.7, 0, -0.6, -1.6, -2.9, -3.2, -3.2, -3.2, -3.2, 0]
	},
	{
		title: "Live",
		levels: [-4.2, -3, -1.5, 3.3, 4.5, 5.1, 4.8, 4.8, 5.1, 4.2, 3.6, 3, 2.4, 2.4, 2.1, 2.1, 1.8, 1.5]
	},
	{
		title: "Party",
		levels: [5.4, 5.4, 5.4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5.4, 5.4]
	},
	{
		title: "Pop",
		levels: [-1.6, 0.6, 3.9, 5.4, 5.5, 4.5, 2.1, 0.9, -0.6, -1.5, -1.5, -1.8, -2.1, -2.1, -2.7, -2.1, -2.1, -0.3]
	},
	{
		title: "Rap",
		levels: [0, 4.2, 5.3, 2.7, 0, -3.9, -4.5, -3.3, 0.3, 1.5, -1.8, -5.4, -0.6, 2.7, 4.5, 5.1, 2.4, 0]
	},
	{
		title: "Reggae",
		levels: [0, 0, 0, 0, 0, -0.3, -1, -2.6, -2.7, 0, 0.9, 2.2, 4, 4.4, 4.4, 2.9, 0.6, 0]
	},
	{
		title: "Rock",
		levels: [5.4, 4.5, 3.6, -3.6, -6.3, -6.6, -3.6, -2.7, -0.3, 2.1, 4.5, 6, 6.9, 7.5, 7.8, 7.8, 7.8, 8.1]
	},
	{
		title: "Ska",
		levels: [-1.3, -1.7, -2.1, -2.6, -3.2, -3, -2.6, -1.4, 0.2, 2.5, 2.7, 3.1, 3.5, 4.2, 5.2, 5.6, 5.8, 5.9]
	},
	{
		title: "Soft",
		levels: [3.9, 2.4, 0.9, 0.6, -1.8, -3.0, -2.1, -1.5, 0.6, 2.1, 4.5, 6.0, 6.9, 7.5, 8.1, 8.1, 8.4, 8.1]
	},
	{
		title: "Soft Rock",
		levels: [1.8, 2.1, 2.1, 2.1, 0.9, -0.3, -1.5, -2.7, -4.5, -3.9, -4.5, -3.9, -3.9, -2.1, 0.0, 2.4, 5.4, 8.1]
	},
	{
		title: "Techno",
		levels: [5.1, 4.8, 4.5, 4.1, 3.5, 1.5, -0.5, -2.4, -3.5, -3.2, -2.6, -1.6, -0.3, 1.6, 4.2, 5.2, 5.8, 5.5]
	},
	{
		title: "Vocal",
		levels: [-4.8, -4.5, -3.9, -2.1, -0.3, 1.2, 1.8, 3.6, 6.6, 9.0, 6.9, 4.5, 2.4, 0.3, -0.9, -2.1, -2.7, -3.0]
	}
];

const equalizerStore = useEqualizerStore();
const { settings, updateSection } = useSettings();
const presets = ref(presetsData);
const selectedPresetIndex = ref(0);
const graphCanvas = ref<HTMLCanvasElement | null>(null);

const frequenciesMap = [31, 63, 87, 125, 175, 250, 350, 500, 700, 1000, 1400, 2000, 2800, 4000, 5600, 8000, 11200, 16000];

const isDragging = ref(false);
const draggedIndex = ref<number | null>(null);
const tooltip = ref({
	visible: false,
	x: 0,
	y: 0,
	frequency: 0,
	level: 0
});

const pixelsY = 6.6;
const pointRadius = 6;
const hitRadius = 12;

const getPixelsX = (): number => {
	if (!graphCanvas.value) {
		return 47;
	}

	const width = graphCanvas.value.width / (window.devicePixelRatio || 1);
	return width / (frequenciesMap.length - 1);
};

onMounted(() => {
	nextTick(() => {
		resizeCanvas();
		findPreset();
		useEventListener(window, "resize", resizeCanvas);
	});
});

const resizeCanvas = () => {
	if (!graphCanvas.value) {
		return;
	}

	const canvas = graphCanvas.value;
	const rect = canvas.getBoundingClientRect();
	const devicePixelRatio = window.devicePixelRatio || 1;
	
	canvas.width = rect.width * devicePixelRatio;
	canvas.height = 300 * devicePixelRatio;
	canvas.style.width = rect.width + "px";
	canvas.style.height = "300px";

	drawGraph();
};

watch(() => settings.value.equalizer.levels, () => {
	drawGraph();
	findPreset();
}, { deep: true });

const getFrequency = (index: number): number => {
	return frequenciesMap[index] || 0;
};

const findPreset = () => {
	const currentLevels = settings.value.equalizer.levels;
	const index = presets.value.findIndex(preset => {
		return JSON.stringify(preset.levels) === JSON.stringify(currentLevels);
	});
	selectedPresetIndex.value = index >= 0 ? index : 0;
};

const changePreset = (event: Event) => {
	const target = event.target as HTMLSelectElement;
	const index = parseInt(target.value);
	const preset = presets.value[index];

	if (preset) {
		updateSection("equalizer", { levels: [...preset.levels] });
		selectedPresetIndex.value = index;
		equalizerStore.setLevels(preset.levels);
	}
};

const updateLevel = (index: number, value: number) => {
	const clampedValue = Math.max(-15, Math.min(15, value));
	const newLevels = [...settings.value.equalizer.levels];
	newLevels[index] = clampedValue;
	updateSection("equalizer", { levels: newLevels });
	equalizerStore.setLevel(index, clampedValue);
};

const getCanvasCoordinates = (event: MouseEvent): { x: number; y: number } | null => {
	if (!graphCanvas.value) {
		return null;
	}

	const rect = graphCanvas.value.getBoundingClientRect();
	const devicePixelRatio = window.devicePixelRatio || 1;

	return {
		x: (event.clientX - rect.left) * devicePixelRatio,
		y: (event.clientY - rect.top) * devicePixelRatio
	};
};

const getPointIndexFromX = (x: number): number | null => {
	const pixelsX = getPixelsX();
	const index = Math.round(x / pixelsX);
	return index >= 0 && index < settings.value.equalizer.levels.length ? index : null;
};

const getLevelFromY = (y: number): number => {
	const devicePixelRatio = window.devicePixelRatio || 1;
	const logicalHeight = 300;
	const cy = logicalHeight * devicePixelRatio * 0.5;
	return (cy - y) / pixelsY;
};

const handleMouseDown = (event: MouseEvent) => {
	const coords = getCanvasCoordinates(event);
	if (!coords || !graphCanvas.value) {
		return;
	}

	const index = getPointIndexFromX(coords.x);
	if (index === null) {
		return;
	}

	const devicePixelRatio = window.devicePixelRatio || 1;
	const logicalHeight = 300;
	const cy = logicalHeight * devicePixelRatio * 0.5;
	const pointY = cy + settings.value.equalizer.levels[index] * -pixelsY * devicePixelRatio;
	const distance = Math.abs(coords.y - pointY);

	if (distance <= hitRadius * devicePixelRatio) {
		isDragging.value = true;
		draggedIndex.value = index;
		updateLevel(index, getLevelFromY(coords.y));
	} else {
		isDragging.value = true;
		draggedIndex.value = index;
		updateLevel(index, getLevelFromY(coords.y));
	}
};

const handleMouseMove = (event: MouseEvent) => {
	const coords = getCanvasCoordinates(event);
	if (!coords || !graphCanvas.value) {
		return;
	}

	if (isDragging.value && draggedIndex.value !== null) {
		const newLevel = getLevelFromY(coords.y);
		updateLevel(draggedIndex.value, newLevel);
		
		const rect = graphCanvas.value.getBoundingClientRect();
		tooltip.value = {
			visible: true,
			x: event.clientX - rect.left,
			y: event.clientY - rect.top - 50,
			frequency: frequenciesMap[draggedIndex.value],
			level: newLevel
		};
	} else {
		const index = getPointIndexFromX(coords.x);
		if (index !== null) {
			const devicePixelRatio = window.devicePixelRatio || 1;
			const logicalHeight = 300;
			const cy = logicalHeight * devicePixelRatio * 0.5;
			const pointY = cy + settings.value.equalizer.levels[index] * -pixelsY * devicePixelRatio;
			const distance = Math.abs(coords.y - pointY);

			if (distance <= hitRadius * devicePixelRatio) {
				const rect = graphCanvas.value.getBoundingClientRect();
				tooltip.value = {
					visible: true,
					x: event.clientX - rect.left,
					y: event.clientY - rect.top - 50,
					frequency: frequenciesMap[index],
					level: settings.value.equalizer.levels[index]
				};
			} else {
				tooltip.value.visible = false;
			}
		} else {
			tooltip.value.visible = false;
		}
	}
};

const handleMouseUp = () => {
	isDragging.value = false;
	draggedIndex.value = null;
};

const handleMouseLeave = () => {
	isDragging.value = false;
	draggedIndex.value = null;
	tooltip.value.visible = false;
};

const updateEqualizerEnable = (event: Event) => {
	const target = event.target as HTMLInputElement;
	updateSection("equalizer", { enable: target.checked });
	equalizerStore.setEnabled(target.checked);
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
					updateSection("equalizer", { levels: preset.levels });
					equalizerStore.setLevels(preset.levels);
				}
			};
			reader.readAsText(file);
		}
	};
	input.click();
};

const drawGraph = () => {
	if (!graphCanvas.value) {
		return;
	}

	const canvas = graphCanvas.value;
	const ctx = canvas.getContext("2d");

	if (!ctx) {
		return;
	}

	const devicePixelRatio = window.devicePixelRatio || 1;
	const width = canvas.width / devicePixelRatio;
	const height = canvas.height / devicePixelRatio;
	const cy = height * 0.5;
	const pixelsX = getPixelsX();
	const bgColor = getComputedStyle(document.documentElement).getPropertyValue("--bg-secondary") || "#1a1a1a";
	const textColor = getComputedStyle(document.documentElement).getPropertyValue("--text") || "#fff";
	const secondaryColor = getComputedStyle(document.documentElement).getPropertyValue("--secondary") || "#e9003f";
	const borderColor = getComputedStyle(document.documentElement).getPropertyValue("--border") || "#282828";

	ctx.clearRect(0, 0, canvas.width, canvas.height);
	ctx.fillStyle = bgColor;
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	ctx.strokeStyle = borderColor;
	ctx.lineWidth = 1 * devicePixelRatio;
	ctx.strokeRect(0, 0, canvas.width, canvas.height);

	ctx.beginPath();
	ctx.moveTo(0, cy * devicePixelRatio);
	ctx.lineTo(canvas.width, cy * devicePixelRatio);
	ctx.strokeStyle = textColor;
	ctx.lineWidth = 1 * devicePixelRatio;
	ctx.stroke();

	const gridLines = [5, 10, -5, -10];
	gridLines.forEach(level => {
		const y = (cy + level * -pixelsY) * devicePixelRatio;
		ctx.beginPath();
		ctx.moveTo(0, y);
		ctx.lineTo(canvas.width, y);
		ctx.strokeStyle = borderColor;
		ctx.lineWidth = 0.5 * devicePixelRatio;
		ctx.setLineDash([2 * devicePixelRatio, 2 * devicePixelRatio]);
		ctx.stroke();
		ctx.setLineDash([]);
	});

	ctx.beginPath();
	ctx.moveTo(0, (cy + settings.value.equalizer.levels[0] * -pixelsY) * devicePixelRatio);

	ctx.strokeStyle = secondaryColor;
	ctx.lineWidth = 2 * devicePixelRatio;

	for (let i = 1; i < settings.value.equalizer.levels.length; i++) {
		const x = i * pixelsX * devicePixelRatio;
		const y = (cy + settings.value.equalizer.levels[i] * -pixelsY) * devicePixelRatio;
		ctx.lineTo(x, y);
	}

	ctx.stroke();

	ctx.fillStyle = secondaryColor;
	for (let i = 0; i < settings.value.equalizer.levels.length; i++) {
		const x = i * pixelsX * devicePixelRatio;
		const y = (cy + settings.value.equalizer.levels[i] * -pixelsY) * devicePixelRatio;

		ctx.beginPath();
		ctx.arc(x, y, pointRadius * devicePixelRatio, 0, Math.PI * 2);
		ctx.fill();

		ctx.strokeStyle = bgColor;
		ctx.lineWidth = 2 * devicePixelRatio;
		ctx.stroke();
	}
};
</script>

<style scoped lang="scss">
.settings-tab-equalizer {
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

.equalizer-actions {
	display: flex;
	gap: 10px;
}

.equalizer-graph-container {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.equalizer-graph-wrapper {
	position: relative;
	width: 100%;
	background: var(--bg-secondary, #1a1a1a);
	border: 1px solid var(--border, #282828);
	border-radius: 10px;
	overflow: hidden;
	box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.equalizer-canvas {
	width: 100%;
	height: 300px;
	cursor: crosshair;
	display: block;
}

.equalizer-frequencies {
	display: flex;
	justify-content: space-between;
	padding: 0 20px;
}

.equalizer-frequency-label {
	font-size: 11px;
	font-weight: 500;
	color: var(--text-secondary, #b3b3b3);
	text-align: center;
	min-width: 40px;
}

.equalizer-tooltip {
	position: absolute;
	background: var(--bg-tertiary, #2a2a2a);
	border: 1px solid var(--border, #3a3a3a);
	border-radius: 6px;
	padding: 8px 12px;
	pointer-events: none;
	z-index: 1000;
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
	transform: translateX(-50%);
}

.tooltip-frequency {
	font-size: 12px;
	font-weight: 600;
	color: var(--text, #fff);
	margin-bottom: 4px;
}

.tooltip-level {
	font-size: 11px;
	font-weight: 500;
	color: var(--secondary, #e9003f);
}
</style>
