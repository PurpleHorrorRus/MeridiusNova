<template>
	<div class="settings-section">
		<div class="section-header">
			<h2 class="section-title">{{ getString("settings.equalizer.graph") }}</h2>
			<button
				@click="toggleSpectrumVisualization"
				class="spectrum-toggle-button"
				:class="{ active: spectrumVisualizationEnabled }"
				:title="spectrumVisualizationEnabled ? getString('settings.equalizer.spectrum.disable') : getString('settings.equalizer.spectrum.enable')"
			>
				<Icon :name="spectrumVisualizationEnabled ? 'mdi:eye' : 'mdi:eye-off'" size="18" />
				<span class="spectrum-toggle-label">{{ getString("settings.equalizer.spectrum.visualization") }}</span>
			</button>
		</div>
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
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from "vue";

import { useEqualizerStore } from "~/stores/equalizer";
import { usePlayerStore } from "~/stores/player";

import { useSpectrumAnalyzer } from "~/composables/useSpectrumAnalyzer";
import { useEventListener } from "~/composables/useEventListener";
import { useStrings } from "~/composables/useStrings";

interface Props {
	levels: number[];
}

interface Emits {
	(e: "update:levels", levels: number[]): void;
	(e: "update-level", index: number, value: number): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const { getString } = useStrings();
const equalizerStore = useEqualizerStore();
const { getAnalyser } = useSpectrumAnalyzer();
const playerStore = usePlayerStore();

const graphCanvas = ref<HTMLCanvasElement | null>(null);
let animationFrameId: number | null = null;
const analyserData = ref<Uint8Array | null>(null);

const spectrumVisualizationEnabled = ref(false);

const UPDATE_INTERVAL = 40;
let lastUpdateTime = performance.now();
let adaptiveMaxValue = 100;
const ADAPTIVE_SMOOTHING = 0.95;
let currentSongId: string | undefined = undefined;

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
	spectrumVisualizationEnabled.value = false;
	nextTick(() => {
		resizeCanvas();
		useEventListener(window, "resize", resizeCanvas);
	});
});

onUnmounted(() => {
	stopSpectrumAnalysis();
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

watch(() => props.levels, () => {
	drawGraph();
}, { deep: true });

const restartSpectrumAnalysis = () => {
	if (!playerStore.isPlaying || !spectrumVisualizationEnabled.value) {
		return;
	}
	
	stopSpectrumAnalysis();
	analyserData.value = null;
	adaptiveMaxValue = 100;
	currentSongId = playerStore.song?.full_id;
	
	const tryStartAnalysis = (attempts = 0) => {
		if (!playerStore.isPlaying || !spectrumVisualizationEnabled.value) {
			return;
		}
		
		const analyser = getAnalyser();
		if (analyser) {
			const bufferLength = analyser.frequencyBinCount;
			if (bufferLength > 0) {
				startSpectrumAnalysis();
				return;
			}
		}
		
		if (attempts < 30) {
			setTimeout(() => {
				tryStartAnalysis(attempts + 1);
			}, attempts < 10 ? 50 : attempts < 20 ? 100 : 200);
		} else {
			console.warn("[EqualizerGraph] Failed to get analyser node after 30 attempts");
		}
	};
	
	setTimeout(() => {
		tryStartAnalysis();
	}, 100);
};

watch(() => playerStore.song?.full_id, (newSongId, oldSongId) => {
	if (newSongId !== oldSongId && playerStore.isPlaying && spectrumVisualizationEnabled.value) {
		restartSpectrumAnalysis();
	}
}, { immediate: false });

watch(() => [playerStore.isPlaying, spectrumVisualizationEnabled.value], ([playing, enabled], [prevPlaying, prevEnabled]) => {
	if (playing && enabled) {
		if (!prevPlaying && playing) {
			currentSongId = playerStore.song?.full_id;
			restartSpectrumAnalysis();
		} else if (playing && !analyserData.value) {
			restartSpectrumAnalysis();
		}
	} else {
		stopSpectrumAnalysis();
		if (!enabled) {
			analyserData.value = null;
		}
		drawGraph();
	}
}, { immediate: false });

const toggleSpectrumVisualization = () => {
	spectrumVisualizationEnabled.value = !spectrumVisualizationEnabled.value;
	
	if (!spectrumVisualizationEnabled.value) {
		stopSpectrumAnalysis();
		analyserData.value = null;
		drawGraph();
	} else if (playerStore.isPlaying) {
		restartSpectrumAnalysis();
	}
};

const updateLevel = (index: number, value: number) => {
	const clampedValue = Math.max(-15, Math.min(15, value));
	emit("update-level", index, clampedValue);
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
	if (!graphCanvas.value) {
		return null;
	}

	const devicePixelRatio = window.devicePixelRatio || 1;
	const width = graphCanvas.value.width / devicePixelRatio;
	const horizontalPadding = 20;
	const availableWidth = width - horizontalPadding * 2;
	
	const relativeX = x / devicePixelRatio - horizontalPadding;
	const normalizedX = relativeX / availableWidth;
	const index = Math.round(normalizedX * (props.levels.length - 1));
	
	return index >= 0 && index < props.levels.length ? index : null;
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

	const level = props.levels[index];
	if (level === undefined) {
		return;
	}

	const devicePixelRatio = window.devicePixelRatio || 1;
	const logicalHeight = 300;
	const cy = logicalHeight * devicePixelRatio * 0.5;
	const pointY = cy + level * -pixelsY * devicePixelRatio;
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
		const frequency = frequenciesMap[draggedIndex.value];
		if (frequency !== undefined) {
			tooltip.value = {
				visible: true,
				x: event.clientX - rect.left,
				y: event.clientY - rect.top - 50,
				frequency,
				level: newLevel
			};
		}
	} else {
		const index = getPointIndexFromX(coords.x);
		if (index !== null) {
			const devicePixelRatio = window.devicePixelRatio || 1;
			const logicalHeight = 300;
			const cy = logicalHeight * devicePixelRatio * 0.5;
			const level = props.levels[index];
			if (level !== undefined) {
				const pointY = cy + level * -pixelsY * devicePixelRatio;
				const distance = Math.abs(coords.y - pointY);

				if (distance <= hitRadius * devicePixelRatio) {
					const rect = graphCanvas.value.getBoundingClientRect();
					const frequency = frequenciesMap[index];
					if (frequency !== undefined) {
						tooltip.value = {
							visible: true,
							x: event.clientX - rect.left,
							y: event.clientY - rect.top - 50,
							frequency,
							level
						};
					}
				} else {
					tooltip.value.visible = false;
				}
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

const startSpectrumAnalysis = () => {
	if (!import.meta.client) {
		return;
	}

	const analyser = equalizerStore.getAnalyserNode();
	if (!analyser) {
		return;
	}

	const bufferLength = analyser.frequencyBinCount;
	if (bufferLength === 0) {
		return;
	}

	const dataArray = new Uint8Array(bufferLength);
	analyserData.value = dataArray;
	lastUpdateTime = performance.now();
	currentSongId = playerStore.song?.full_id;

	let storedAnalyser: AnalyserNode | null = analyser;

	let lastDataCheck = performance.now();
	let lastDataSum = 0;

	const updateSpectrum = () => {
		const songId = playerStore.song?.full_id;
		const currentAnalyser = equalizerStore.getAnalyserNode();
		
		// Проверка на смену трека - более надежная
		if (songId !== currentSongId) {
			currentSongId = songId;
			stopSpectrumAnalysis();
			storedAnalyser = null;
			analyserData.value = null;
			adaptiveMaxValue = 100;
			if (playerStore.isPlaying && spectrumVisualizationEnabled.value) {
				restartSpectrumAnalysis();
			}
			return;
		}

		if (!currentAnalyser || !playerStore.isPlaying || !spectrumVisualizationEnabled.value) {
			stopSpectrumAnalysis();
			storedAnalyser = null;
			return;
		}

		// Если анализатор изменился (например, при crossfade), переинициализируем
		if (currentAnalyser !== storedAnalyser) {
			storedAnalyser = currentAnalyser;
			const bufferLength = currentAnalyser.frequencyBinCount;
			if (bufferLength > 0) {
				analyserData.value = new Uint8Array(bufferLength);
				lastDataCheck = performance.now();
				lastDataSum = 0;
				currentSongId = playerStore.song?.full_id; // Обновляем ID трека при смене анализатора
			} else {
				stopSpectrumAnalysis();
				if (playerStore.isPlaying && spectrumVisualizationEnabled.value) {
					restartSpectrumAnalysis();
				}
				return;
			}
		}

		if (!analyserData.value) {
			stopSpectrumAnalysis();
			return;
		}

		const currentBufferLength = currentAnalyser.frequencyBinCount;
		if (currentBufferLength === 0) {
			stopSpectrumAnalysis();
			analyserData.value = null;
			storedAnalyser = null;
			return;
		}

		if (currentBufferLength !== analyserData.value.length) {
			analyserData.value = new Uint8Array(currentBufferLength);
			lastDataCheck = performance.now();
			lastDataSum = 0;
		}

		const currentTime = performance.now();
		if (currentTime - lastUpdateTime >= UPDATE_INTERVAL) {
			const dataArray = analyserData.value;
			if (dataArray) {
				currentAnalyser.getByteFrequencyData(dataArray as any);
				
				const currentDataSum = Array.from(dataArray).reduce((sum, val) => sum + val, 0);
				
				// Проверка на замершие данные - если данные не меняются более 1 секунды, перезапускаем
				if (currentTime - lastDataCheck > 1000) {
					if (Math.abs(currentDataSum - lastDataSum) < 10) {
						stopSpectrumAnalysis();
						analyserData.value = null;
						storedAnalyser = null;
						adaptiveMaxValue = 100;
						if (playerStore.isPlaying && spectrumVisualizationEnabled.value) {
							restartSpectrumAnalysis();
						}
						return;
					}
					lastDataCheck = currentTime;
					lastDataSum = currentDataSum;
				}
				
				drawGraph();
				lastUpdateTime = currentTime;
			} else {
				// Если dataArray стал null, перезапускаем
				stopSpectrumAnalysis();
				if (playerStore.isPlaying && spectrumVisualizationEnabled.value) {
					restartSpectrumAnalysis();
				}
				return;
			}
		}

		animationFrameId = requestAnimationFrame(updateSpectrum);
	};

	animationFrameId = requestAnimationFrame(updateSpectrum);
};

const stopSpectrumAnalysis = () => {
	if (animationFrameId !== null) {
		cancelAnimationFrame(animationFrameId);
		animationFrameId = null;
	}
};

const getFrequencyData = (): number[] => {
	if (!analyserData.value) {
		return new Array(frequenciesMap.length).fill(0);
	}

	const analyser = equalizerStore.getAnalyserNode();
	if (!analyser) {
		return new Array(frequenciesMap.length).fill(0);
	}

	const sampleRate = analyser.context.sampleRate;
	const nyquist = sampleRate / 2;
	const bufferLength = analyser.frequencyBinCount;
	const dataArray = analyserData.value;

	let currentMaxValue = 0;
	let sumAllValues = 0;
	let countAllValues = 0;

	for (let i = 0; i < dataArray.length; i++) {
		const value = dataArray[i];
		if (value !== undefined) {
			if (value > currentMaxValue) {
				currentMaxValue = value;
			}
			sumAllValues += value;
			countAllValues++;
		}
	}

	const averageValue = countAllValues > 0 ? sumAllValues / countAllValues : 0;
	
	const percentile95 = currentMaxValue * 0.95;
	
	if (adaptiveMaxValue < percentile95) {
		adaptiveMaxValue = percentile95;
	} else {
		adaptiveMaxValue = adaptiveMaxValue * ADAPTIVE_SMOOTHING + percentile95 * (1 - ADAPTIVE_SMOOTHING);
	}
	
	if (adaptiveMaxValue < 10) {
		adaptiveMaxValue = 10;
	}

	const frequencyData: number[] = [];

	for (let i = 0; i < frequenciesMap.length; i++) {
		const targetFrequency = frequenciesMap[i];
		if (targetFrequency === undefined) {
			frequencyData.push(0);
			continue;
		}
		
		const binIndex = (targetFrequency / nyquist) * bufferLength;
		
		const frequencyRange = targetFrequency * 0.02;
		const binRange = (frequencyRange / nyquist) * bufferLength;
		const startBin = Math.max(0, Math.floor(binIndex - binRange));
		const endBin = Math.min(bufferLength - 1, Math.ceil(binIndex + binRange));
		
		let sum = 0;
		let count = 0;
		for (let bin = startBin; bin <= endBin; bin++) {
			const value = dataArray[bin];
			if (value !== undefined) {
				sum += value;
				count++;
			}
		}
		
		const rawValue = count > 0 ? sum / count : (dataArray[Math.round(binIndex)] ?? 0);
		
		const normalizedValue = adaptiveMaxValue > 0 ? rawValue / adaptiveMaxValue : 0;
		
		const enhancedValue = Math.pow(Math.max(0, Math.min(1, normalizedValue)), 0.6);
		
		const mappedValue = enhancedValue * 12;
		
		frequencyData.push(mappedValue);
	}

	return frequencyData;
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
	const horizontalPadding = 20;
	const availableWidth = width - horizontalPadding * 2;
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

	if (playerStore.isPlaying && analyserData.value && spectrumVisualizationEnabled.value) {
		const spectrumData = getFrequencyData();
		const firstValue = spectrumData[0];
		
		if (firstValue !== undefined) {
			ctx.beginPath();
			ctx.moveTo(0, cy * devicePixelRatio);
			ctx.lineTo(0, (cy + firstValue * -pixelsY) * devicePixelRatio);
			
			for (let i = 1; i < spectrumData.length; i++) {
				const value = spectrumData[i];
				if (value !== undefined) {
					const x = (i / (spectrumData.length - 1)) * canvas.width;
					const y = (cy + value * -pixelsY) * devicePixelRatio;
					ctx.lineTo(x, y);
				}
			}
			
			ctx.lineTo(canvas.width, cy * devicePixelRatio);
			ctx.closePath();
			
			const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
			gradient.addColorStop(0, "rgba(233, 0, 63, 0.3)");
			gradient.addColorStop(1, "rgba(233, 0, 63, 0.05)");
			ctx.fillStyle = gradient;
			ctx.fill();
			
			ctx.beginPath();
			ctx.moveTo(0, (cy + firstValue * -pixelsY) * devicePixelRatio);
			
			ctx.strokeStyle = "rgba(233, 0, 63, 0.9)";
			ctx.lineWidth = 2 * devicePixelRatio;
			ctx.globalAlpha = 1.0;

			for (let i = 1; i < spectrumData.length; i++) {
				const value = spectrumData[i];
				if (value !== undefined) {
					const x = (i / (spectrumData.length - 1)) * canvas.width;
					const y = (cy + value * -pixelsY) * devicePixelRatio;
					ctx.lineTo(x, y);
				}
			}

			ctx.stroke();
		}
	}


	const firstLevel = props.levels[0];
	if (firstLevel !== undefined) {
		ctx.beginPath();
		ctx.moveTo(horizontalPadding * devicePixelRatio, (cy + firstLevel * -pixelsY) * devicePixelRatio);

		ctx.strokeStyle = secondaryColor;
		ctx.lineWidth = 2 * devicePixelRatio;

		for (let i = 1; i < props.levels.length; i++) {
			const level = props.levels[i];
			if (level !== undefined) {
				const x = (horizontalPadding + (i / (props.levels.length - 1)) * availableWidth) * devicePixelRatio;
				const y = (cy + level * -pixelsY) * devicePixelRatio;
				ctx.lineTo(x, y);
			}
		}

		ctx.stroke();

		ctx.fillStyle = secondaryColor;
		for (let i = 0; i < props.levels.length; i++) {
			const level = props.levels[i];
			if (level !== undefined) {
				const x = (horizontalPadding + (i / (props.levels.length - 1)) * availableWidth) * devicePixelRatio;
				const y = (cy + level * -pixelsY) * devicePixelRatio;

				ctx.beginPath();
				ctx.arc(x, y, pointRadius * devicePixelRatio, 0, Math.PI * 2);
				ctx.fill();

				ctx.strokeStyle = bgColor;
				ctx.lineWidth = 2 * devicePixelRatio;
				ctx.stroke();
			}
		}
	}

	for (let i = 0; i < frequenciesMap.length; i++) {
		const x = (horizontalPadding + (i / (frequenciesMap.length - 1)) * availableWidth) * devicePixelRatio;
		ctx.beginPath();
		ctx.moveTo(x, 0);
		ctx.lineTo(x, canvas.height);
		ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
		ctx.lineWidth = 1 * devicePixelRatio;
		ctx.setLineDash([4 * devicePixelRatio, 4 * devicePixelRatio]);
		ctx.stroke();
		ctx.setLineDash([]);
	}

	ctx.fillStyle = textColor;
	ctx.font = `${11 * devicePixelRatio}px sans-serif`;
	ctx.textAlign = "center";
	ctx.textBaseline = "top";
	
	const labelY = (height - 20) * devicePixelRatio;
	
	for (let i = 0; i < frequenciesMap.length; i++) {
		const frequency = frequenciesMap[i];
		if (frequency === undefined) {
			continue;
		}
		
		const x = (horizontalPadding + (i / (frequenciesMap.length - 1)) * availableWidth) * devicePixelRatio;
		const label = frequency < 1000 ? frequency.toString() : (frequency / 1000).toFixed(1) + "k";
		
		ctx.fillText(label, x, labelY);
	}
};
</script>

<style scoped lang="scss">
.settings-section {
	display: flex;
	flex-direction: column;
	gap: 20px;
}

.section-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16px;

	@media (max-width: 768px) {
		flex-direction: column;
		align-items: flex-start;
	}
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

.spectrum-toggle-button {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 8px 14px;
	background: var(--bg-secondary, #1a1a1a);
	border: 1px solid var(--border, #282828);
	border-radius: 6px;
	color: var(--text-secondary, #b3b3b3);
	font-size: 13px;
	font-weight: 500;
	cursor: pointer;
	transition: all 0.2s ease;
	white-space: nowrap;

	&.active {
		background: var(--secondary, #e9003f);
		border-color: var(--secondary, #e9003f);
		color: var(--text, #fff);
	}

	@media (max-width: 768px) {
		width: 100%;
		justify-content: center;
	}
}

.spectrum-toggle-label {
	user-select: none;
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

