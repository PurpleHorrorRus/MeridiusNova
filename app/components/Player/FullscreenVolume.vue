<template>
	<div v-if="!isMobile" class="fullscreen-volume-top">
		<button @click="volumeSlider.toggleMute" class="btn-mute-fullscreen">
			<Icon 
				:name="volumeSlider.muted.value ? 'mdi:volume-mute' : (volumeSlider.volume.value === 0 ? 'mdi:volume-off' : (volumeSlider.volume.value < 0.5 ? 'mdi:volume-low' : 'mdi:volume-high'))" 
				size="20" 
			/>
		</button>
		<div 
			class="fullscreen-volume-slider"
			:ref="volumeSlider.volumeSliderRef"
			@mousedown="volumeSlider.handleVolumeSliderMouseDown"
			@wheel="volumeSlider.handleVolumeWheel"
		>
			<input
				:ref="volumeSlider.volumeRangeInputRef"
				type="range"
				min="0"
				max="1000"
				step="1"
				:value="volumeSlider.volume.value * 1000"
				@input="volumeSlider.handleVolumeChange"
				class="fullscreen-volume-range"
			/>
			<div class="fullscreen-volume-fill" :style="{ width: `${volumeSlider.volume.value * 100}%` }"></div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { useVolumeSlider } from "~/composables/useVolumeSlider";
import { useIsMobile } from "~/composables/useIsMobile";

const volumeSlider = useVolumeSlider();
const { isMobile } = useIsMobile();
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

