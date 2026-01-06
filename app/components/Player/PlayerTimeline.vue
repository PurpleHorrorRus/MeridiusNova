<template>
	<div 
		class="player-timeline" 
		@click.stop="handleProgressClick"
		@mousemove="handleProgressHover"
		@mouseleave="showTooltip = false"
		@touchstart="handleProgressTouch"
		@touchmove="handleProgressTouchMove"
		@touchend="handleProgressTouchEnd"
		@touchcancel="handleProgressTouchEnd"
	>
		<div class="timeline-track">
			<div class="timeline-fill" :style="{ width: `${throttledProgress}%` }">
				<div class="timeline-knob"></div>
			</div>
		</div>
		<div
			v-if="showTooltip"
			class="timeline-tooltip"
			:style="{ left: `${tooltipPosition}%` }"
		>
			{{ playerStore.formatTime(tooltipTime) }}
		</div>
	</div>
</template>

<script setup lang="ts">
import { watch } from "vue";
import { usePlayerTimeline } from "~/composables/usePlayerTimeline";

import { storeToRefs } from "pinia";
import { usePlayerStore } from "~/stores/player";

const playerStore = usePlayerStore();
const { progress } = storeToRefs(playerStore);

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
} = usePlayerTimeline(150);

watch(progress, (newProgress) => {
	updateThrottledProgress(newProgress);
}, { immediate: true });
</script>

<style scoped lang="scss">
.player-timeline {
	position: absolute;
	top: -6px;
	left: 24px;
	right: 24px;
	height: 6px;
	cursor: pointer;
	z-index: 10;
	border-radius: 20px 20px 0 0;
	overflow: visible;

	@media (max-width: 1400px) {
		left: 16px;
		right: 16px;
	}

	@media (max-width: 1200px) {
		left: 12px;
		right: 12px;
	}

	@media (max-width: 1000px) {
		left: 8px;
		right: 8px;
	}

	@media (max-width: 800px) {
		top: 0;
		left: 6px;
		right: 6px;
		border-radius: 16px;
		touch-action: pan-y;
	}

	@media (max-width: 700px) {
		left: 4px;
		right: 4px;
		border-radius: 12px;
	}

	@media (max-width: 600px) {
		left: 4px;
		right: 4px;
		border-radius: 10px 10px 0 0;
	}
}

.player-timeline:hover {
	height: 10px;

	.timeline-track {
		border-radius: 12px;
	}	
}

.timeline-track {
	position: relative;

	width: 100%;
	height: 100%;
	
	background: rgba(255, 255, 255, 0.1);
	border-radius: 20px 20px 0 0;

	overflow: hidden;
	pointer-events: none;
}

.timeline-fill {
	height: 100%;
	background: rgba(255, 255, 255, 0.9);
	position: relative;
	// Убрана анимация width для производительности - обновление происходит слишком часто
	box-shadow: 0 0 8px rgba(255, 255, 255, 0.4);
	pointer-events: none;
}

.player-timeline:hover .timeline-fill {
	background: rgba(255, 255, 255, 1);
	box-shadow: 0 0 12px rgba(255, 255, 255, 0.6);
}

.timeline-knob {
	position: absolute;
	right: -6px;
	top: 50%;
	transform: translateY(-50%) scale(0);
	width: 12px;
	height: 12px;
	background: #fff;
	border-radius: 50%;
	transition: transform 0.2s ease, opacity 0.2s ease;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
	opacity: 0;
	pointer-events: none;
}

.player-timeline:hover .timeline-knob {
	transform: translateY(-50%) scale(1);
	opacity: 1;
}

.timeline-tooltip {
	position: absolute;
	bottom: 100%;
	margin-bottom: 12px;
	padding: 6px 10px;
	background: rgba(0, 0, 0, 0.9);
	border-radius: 8px;

	font-size: 12px;
	color: #fff;
	transform: translateX(-50%);
	pointer-events: none;
	white-space: nowrap;
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
	border: 1px solid rgba(255, 255, 255, 0.1);
	z-index: 11;

	@media (max-width: 1000px) {
		font-size: 11px;
		padding: 4px 8px;
		margin-bottom: 10px;
	}
}
</style>

