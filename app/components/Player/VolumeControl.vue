<template>
	<div
		v-if="visible"
		class="volume-control"
		:class="`volume-control--${variant}`"
		@wheel="handleVolumeWheel"
	>
		<button @click="playerStore.toggleMute" type="button" class="volume-control__btn">
			<Icon
				v-if="!showVolumePercent"
				:name="muted ? 'mdi:volume-mute' : (volume === 0 ? 'mdi:volume-off' : (volume < 0.5 ? 'mdi:volume-low' : 'mdi:volume-high'))"
				size="20"
			/>
			<span v-else class="volume-control__percent">{{ Math.round(volume * 100) }}%</span>
		</button>
		<div
			class="volume-control__slider"
			:ref="volumeSliderRef as any"
			@mousedown="handleVolumeSliderMouseDown"
		>
			<input
				:ref="volumeRangeInputRef as any"
				type="range"
				min="0"
				max="1000"
				step="1"
				:value="volume * 1000"
				@input="handleVolumeChange"
				class="volume-control__range"
			/>
			<div class="volume-control__fill" :style="{ width: `${volume * 100}%` }"></div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted, computed } from "vue";
import { storeToRefs } from "pinia";

import { usePlayerStore } from "~/stores/player";
import { useSettingsStore } from "~/stores/settings";

import { useIsMobile } from "~/composables/useIsMobile";

const props = withDefaults(
	defineProps<{
		variant: "player" | "fullscreen";
	}>(),
	{ variant: "player" }
);

const playerStore = usePlayerStore();
const settingsStore = useSettingsStore();
const { isMobile } = useIsMobile();

const { volume, muted } = storeToRefs(playerStore);
const { settings } = storeToRefs(settingsStore);

const visible = computed(() =>
	props.variant === "fullscreen" ? !isMobile.value : true
);

const volumeSliderRef = ref<HTMLElement | null>(null);
const volumeRangeInputRef = ref<HTMLInputElement | null>(null);

const showVolumePercent = ref(false);
let volumePercentTimeout: ReturnType<typeof setTimeout> | null = null;

const showVolumePercentHandler = () => {
	showVolumePercent.value = true;

	if (volumePercentTimeout) {
		clearTimeout(volumePercentTimeout);
	}

	volumePercentTimeout = setTimeout(() => {
		showVolumePercent.value = false;
		volumePercentTimeout = null;
	}, 1000);
};

watch(volume, showVolumePercentHandler);

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

onUnmounted(() => {
	if (volumePercentTimeout) {
		clearTimeout(volumePercentTimeout);
		volumePercentTimeout = null;
	}
});
</script>

<style scoped lang="scss">
.volume-control {
	display: flex;
	align-items: center;
	gap: 8px;
}

.volume-control--player {
	width: 160px;

	.volume-control__slider {
		min-width: 72px;
	}
}

.volume-control--fullscreen {
	gap: 12px;
	width: 100%;
	max-width: 250px;
	margin-bottom: 16px;
	justify-content: center;
	min-height: 28px;
	align-items: center;

	@media (max-width: 768px) {
		display: none;
	}
}

.volume-control__btn {
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

	@media (max-width: 1200px) {
		padding: 3px;
		width: 24px;
		min-width: 24px;

		:deep(svg) {
			width: 18px;
			height: 18px;
		}
	}

	@media (max-width: 1000px) {
		padding: 2px;
		width: 20px;
		min-width: 20px;

		:deep(svg) {
			width: 16px;
			height: 16px;
		}
	}

	&:hover {
		color: #fff;
	}
}

.volume-control--fullscreen .volume-control__btn {
	width: 28px;
	min-width: 28px;
	height: 28px;
	min-height: 28px;

	@media (max-width: 768px) {
		width: 28px;
		min-width: 28px;
		height: 28px;
		min-height: 28px;
	}
}

.volume-control__percent {
	font-size: 12px;
	font-weight: 500;
	line-height: 1;
	color: rgba(255, 255, 255, 0.9);
	text-align: center;
	display: inline-block;
	width: 100%;

	@media (max-width: 1200px) {
		font-size: 11px;
	}

	@media (max-width: 1000px) {
		font-size: 10px;
	}
}

.volume-control--fullscreen .volume-control__percent {
	font-size: 12px;
	line-height: 1;
}

.volume-control__slider {
	flex: 1;
	min-width: 120px;
	height: 4px;
	position: relative;
	background: rgba(255, 255, 255, 0.1);
	border-radius: 2px;
	margin: 0;
	padding: 0;
	box-sizing: border-box;
	overflow: visible;
	display: block;
	cursor: pointer;
}

.volume-control--fullscreen .volume-control__slider {
	min-width: 0;

	&:hover {
		height: 6px;
	}
}

.volume-control__range {
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

.volume-control__range::-webkit-slider-runnable-track {
	width: 100%;
	height: 100%;
	margin: 0;
	padding: 0;
	border: 0;
}

.volume-control__range::-webkit-slider-thumb {
	-webkit-appearance: none;
	appearance: none;
	width: 0;
	height: 0;
	margin: 0;
	padding: 0;
}

.volume-control__range::-moz-range-track {
	width: 100%;
	height: 100%;
	margin: 0;
	padding: 0;
	border: 0;
}

.volume-control__range::-moz-range-thumb {
	width: 0;
	height: 0;
	border: none;
	margin: 0;
	padding: 0;
}

.volume-control__fill {
	height: 100%;
	background: rgba(255, 255, 255, 0.8);
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

.volume-control--fullscreen .volume-control__slider:hover .volume-control__fill {
	background: #fff;
}

.volume-control--fullscreen .volume-control__slider {
	background: rgba(255, 255, 255, 0.15);
}

.volume-control--fullscreen .volume-control__fill {
	background: rgba(255, 255, 255, 0.9);
}
</style>
