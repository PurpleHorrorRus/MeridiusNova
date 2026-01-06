<template>
	<div v-if="!isMobile" class="fullscreen-volume-top">
		<button @click="playerStore.toggleMute" class="btn-mute-fullscreen">
			<Icon 
				:name="muted ? 'mdi:volume-mute' : (volume === 0 ? 'mdi:volume-off' : (volume < 0.5 ? 'mdi:volume-low' : 'mdi:volume-high'))" 
				size="20" 
			/>
		</button>
		<div 
			class="fullscreen-volume-slider"
			:ref="(volumeSliderRef as any)"
			@mousedown="handleVolumeSliderMouseDown"
			@wheel="handleVolumeWheel"
		>
			<input
				:ref="(volumeRangeInputRef as any)"
				type="range"
				min="0"
				max="1000"
				step="1"
				:value="volume * 1000"
				@input="handleVolumeChange"
				class="fullscreen-volume-range"
			/>
			<div class="fullscreen-volume-fill" :style="{ width: `${volume * 100}%` }"></div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { storeToRefs } from "pinia";
import { usePlayerStore } from "~/stores/player";
import { useSettingsStore } from "~/stores/settings";
import { useIsMobile } from "~/composables/useIsMobile";

const playerStore = usePlayerStore();
const settingsStore = useSettingsStore();
const { isMobile } = useIsMobile();

const { volume, muted } = storeToRefs(playerStore);
const { settings } = storeToRefs(settingsStore);

const volumeSliderRef = ref<HTMLElement | null>(null);
const volumeRangeInputRef = ref<HTMLInputElement | null>(null);

const handleVolumeChange = async (event: Event) => {
	const target = event.target as HTMLInputElement;
	const newVolume = Number(target.value) / 1000;
	await playerStore.setVolume(newVolume);
};

const handleVolumeSliderMouseDown = async (event: MouseEvent) => {
	const clickedElement = event.target as HTMLElement;
	
	if (clickedElement.tagName === "INPUT") {
		const inputElement = clickedElement as HTMLInputElement;
		if (inputElement.type === "range") {
			event.stopPropagation();
			return;
		}
	}

	event.preventDefault();
	event.stopPropagation();

	const slider = volumeSliderRef.value;
	const rangeInput = volumeRangeInputRef.value;
	
	if (!slider || !rangeInput) {
		return;
	}

	const getOffsetX = (mouseEvent: MouseEvent): number => {
		const currentSliderRect = slider.getBoundingClientRect();
		return mouseEvent.clientX - currentSliderRect.left;
	};

	const offsetX = getOffsetX(event);
	const width = slider.clientWidth;
	const percentage = Math.max(0, Math.min(1, offsetX / width));
	const newValue = Math.round(percentage * 1000);
	const newVolume = newValue / 1000;
	
	rangeInput.value = String(newValue);
	await playerStore.setVolume(newVolume);

	const handleMouseMove = async (moveEvent: MouseEvent) => {
		const moveOffsetX = getOffsetX(moveEvent);
		const moveWidth = slider.clientWidth;
		const movePercentage = Math.max(0, Math.min(1, moveOffsetX / moveWidth));
		const moveValue = Math.round(movePercentage * 1000);
		const moveVolume = moveValue / 1000;
		
		rangeInput.value = String(moveValue);
		await playerStore.setVolume(moveVolume);
	};

	const handleMouseUp = () => {
		document.removeEventListener("mousemove", handleMouseMove);
		document.removeEventListener("mouseup", handleMouseUp);
	};

	document.addEventListener("mousemove", handleMouseMove);
	document.addEventListener("mouseup", handleMouseUp);
};

const handleVolumeWheel = async (event: WheelEvent) => {
	event.preventDefault();
	event.stopPropagation();

	const hasWheelStep = settings.value
		&& settings.value.player
		&& settings.value.player.step
		&& settings.value.player.step.wheel;

	const wheelStepValue = hasWheelStep
		? settings.value.player.step.wheel
		: 1;

	const wheelStep = wheelStepValue / 100;
	const delta = event.deltaY > 0 ? -wheelStep : wheelStep;
	const newVolume = Math.max(0, Math.min(1, volume.value + delta));
	
	await playerStore.setVolume(newVolume);
};
</script>

<style scoped lang="scss">
.fullscreen-volume-top {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 12px;
	width: 100%;
	max-width: 250px;
	margin-bottom: 16px;

	@media (max-width: 768px) {
		display: none;
	}
}

.btn-mute-fullscreen {
	background: none;
	border: none;
	color: rgba(255, 255, 255, 0.7);
	cursor: pointer;
	padding: 4px;
	display: flex;
	align-items: center;
	justify-content: center;
	transition: color 0.2s ease;
	width: 28px;
	min-width: 28px;
	flex-shrink: 0;

	@media (max-width: 768px) {
		width: 28px;
		min-width: 28px;
	}

	&:hover {
		color: #fff;
	}
}

.fullscreen-volume-slider {
	flex: 1;
	height: 4px;
	position: relative;
	background: rgba(255, 255, 255, 0.15);
	border-radius: 2px;
	margin: 0;
	padding: 0;
	box-sizing: border-box;
	overflow: visible;
	display: block;
	cursor: pointer;

	&:hover {
		height: 6px;
	}
}

.fullscreen-volume-range {
	position: absolute;
	width: 100%;
	height: 100%;
	left: 0;
	top: 0;
	opacity: 0;
	cursor: pointer;
	z-index: 3;
	pointer-events: auto;
	-webkit-appearance: none;
	appearance: none;
	margin: 0;
	padding: 0;
	border: 0;
	box-sizing: border-box;
	outline: none;
}

.fullscreen-volume-range::-webkit-slider-runnable-track {
	width: 100%;
	height: 100%;
	margin: 0;
	padding: 0;
	border: 0;
}

.fullscreen-volume-range::-webkit-slider-thumb {
	-webkit-appearance: none;
	appearance: none;
	width: 0;
	height: 0;
	margin: 0;
	padding: 0;
}

.fullscreen-volume-range::-moz-range-track {
	width: 100%;
	height: 100%;
	margin: 0;
	padding: 0;
	border: 0;
}

.fullscreen-volume-range::-moz-range-thumb {
	width: 0;
	height: 0;
	border: none;
	margin: 0;
	padding: 0;
}

.fullscreen-volume-fill {
	height: 100%;
	background: rgba(255, 255, 255, 0.9);
	border-radius: 2px;
	position: absolute;
	left: 0;
	top: 0;
	pointer-events: none;
	margin: 0;
	padding: 0;
	box-sizing: border-box;
	transition: background 0.2s ease;
}

.fullscreen-volume-slider:hover .fullscreen-volume-fill {
	background: #fff;
}
</style>

