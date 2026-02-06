<template>
	<div class="fullscreen-timeline">
		<div class="fullscreen-timeline-time">
			<span class="time-current-fullscreen">{{ playerStore.formatTime(currentTime) }}</span>
			<span class="time-duration-fullscreen">{{ playerStore.formatTime(duration) }}</span>
		</div>
		<div 
			class="fullscreen-timeline-track" 
			@click="handleProgressClick"
			@mousemove="handleProgressHover"
			@mouseleave="showTooltip = false"
			@touchstart="handleProgressTouch"
			@touchmove="handleProgressTouchMove"
			@touchend="handleProgressTouchEnd"
			@touchcancel="handleProgressTouchEnd"
		>
			<div class="fullscreen-timeline-fill" :style="{ width: `${throttledProgress}%` }">
				<div class="fullscreen-timeline-knob"></div>
			</div>
		</div>
		<div
			v-if="showTooltip"
			class="fullscreen-timeline-tooltip"
			:style="{ left: `${tooltipPosition}%` }"
		>
			{{ playerStore.formatTime(tooltipTime) }}
		</div>
	</div>
</template>

<script setup lang="ts">
import { watch } from "vue";
import { storeToRefs } from "pinia";

import { usePlayerStore } from "~/stores/player";

import { usePlayerTimeline } from "~/composables/usePlayerTimeline";

const playerStore = usePlayerStore();
const { currentTime, duration, progress } = storeToRefs(playerStore);

const {
	throttledProgress,
	showTooltip,
	tooltipTime,
	tooltipPosition,
	updateThrottledProgress,
	handleProgressClick,
	handleProgressHover,
	handleProgressTouch,
	handleProgressTouchMove,
	handleProgressTouchEnd
} = usePlayerTimeline(100);

watch(progress, (newProgress) => {
	updateThrottledProgress(newProgress);
}, { immediate: true });
</script>

<style scoped lang="scss">
.fullscreen-timeline {
	width: 100%;
	padding: 0 20px;
	position: relative;

	@media (max-width: 768px) {
		padding: 0 16px;
	}
}

.fullscreen-timeline-time {
	display: flex;
	align-items: center;
	justify-content: space-between;
	width: 100%;
	margin-bottom: 8px;
	font-size: 14px;
	font-weight: 500;
	letter-spacing: 0.5px;
	font-family: monospace;

	@media (max-width: 768px) {
		font-size: 12px;
		margin-bottom: 6px;
	}

	@media (max-width: 480px) {
		font-size: 11px;
		margin-bottom: 4px;
	}
}

.fullscreen-timeline-track {
	width: 100%;
	height: 8px;
	background: rgba(255, 255, 255, 0.15);
	border-radius: 4px;
	cursor: pointer;
	position: relative;
	overflow: visible;

	@media (max-width: 768px) {
		height: 6px;
	}
}

.fullscreen-timeline-fill {
	height: 100%;
	background: rgba(255, 255, 255, 0.9);
	border-radius: 4px;
	position: relative;

	&::before {
		content: "";
		position: absolute;
		inset: 0;
		border-radius: 4px;
		background: radial-gradient(ellipse at right center, rgba(255, 255, 255, 0.5) 0%, transparent 70%);
		opacity: 1;
		pointer-events: none;
	}
}

.fullscreen-timeline-track:hover .fullscreen-timeline-fill {
	background: #fff;

	&::before {
		opacity: 1.2;
	}
}

.fullscreen-timeline-knob {
	position: absolute;
	right: -8px;
	top: 50%;
	transform: translateY(-50%) scale(0);
	width: 16px;
	height: 16px;
	background: #fff;
	border-radius: 50%;
	transition: transform 0.2s ease, opacity 0.2s ease;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
	opacity: 0;
	pointer-events: none;

	@media (max-width: 768px) {
		width: 14px;
		height: 14px;
		right: -7px;
	}
}

.fullscreen-timeline-track:hover .fullscreen-timeline-knob {
	transform: translateY(-50%) scale(1);
	opacity: 1;
}

.fullscreen-timeline-tooltip {
	position: absolute;
	bottom: 100%;
	margin-bottom: 16px;
	padding: 8px 12px;
	background: rgba(0, 0, 0, 0.9);
	border-radius: 8px;

	font-size: 14px;
	color: #fff;
	transform: translateX(-50%);
	pointer-events: none;
	white-space: nowrap;
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
	border: 1px solid rgba(255, 255, 255, 0.1);
	z-index: 11;

	@media (max-width: 768px) {
		font-size: 12px;
		padding: 6px 10px;
		margin-bottom: 12px;
	}
}

.time-current-fullscreen {
	color: rgba(255, 255, 255, 0.95);
	display: inline-block;
	min-width: 60px;
	text-align: right;
}

.time-duration-fullscreen {
	color: rgba(255, 255, 255, 0.7);
	display: inline-block;
	min-width: 60px;
	text-align: left;
}
</style>

