<template>
	<div 
		class="player-timeline" 
		@click.stop="handleProgressClick"
		@mousemove="handleProgressHover"
		@mouseleave="showTooltip = false"
		@touchstart="handleProgressTouch"
		@touchmove="handleProgressTouchMove"
		@touchend="showTooltip = false"
	>
		<div class="timeline-track">
			<div class="timeline-fill" :style="{ width: `${progress}%` }">
				<div class="timeline-knob"></div>
			</div>
		</div>
		<div
			v-if="showTooltip"
			class="timeline-tooltip"
			:style="{ left: `${tooltipPosition}%` }"
		>
			{{ formatTime(tooltipTime) }}
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useAudio } from "~/composables/useAudio";

const { duration, progress, seek } = useAudio();

const showTooltip = ref(false);
const tooltipTime = ref(0);
const tooltipPosition = ref(0);

const formatTime = (seconds: number): string => {
	if (!isFinite(seconds) || isNaN(seconds)) {
		return "0:00";
	}

	const mins = Math.floor(seconds / 60);
	const secs = Math.floor(seconds % 60);
	return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const handleProgressClick = (event: MouseEvent) => {
	const target = event.currentTarget as HTMLElement;
	const rect = target.getBoundingClientRect();
	const x = event.clientX - rect.left;
	const percentage = x / rect.width;
	const newTime = percentage * duration.value;

	seek(newTime);
};

const handleProgressHover = (event: MouseEvent) => {
	const currentDuration = duration.value;
	
	if (!currentDuration || !isFinite(currentDuration) || currentDuration <= 0) {
		showTooltip.value = false;
		return;
	}

	const target = event.currentTarget as HTMLElement;
	const rect = target.getBoundingClientRect();
	const x = event.clientX - rect.left;
	const percentage = Math.max(0, Math.min(1, x / rect.width));

	tooltipTime.value = percentage * currentDuration;
	tooltipPosition.value = percentage * 100;
	showTooltip.value = true;
};

const handleProgressTouch = (event: TouchEvent) => {
	const target = event.currentTarget as HTMLElement;
	const rect = target.getBoundingClientRect();
	const touch = event.touches[0] || event.changedTouches[0];
	
	if (!touch) {
		return;
	}
	
	const x = touch.clientX - rect.left;
	const percentage = Math.max(0, Math.min(1, x / rect.width));
	const newTime = percentage * duration.value;

	seek(newTime);
};

const handleProgressTouchMove = (event: TouchEvent) => {
	const currentDuration = duration.value;
	
	if (!currentDuration || !isFinite(currentDuration) || currentDuration <= 0) {
		showTooltip.value = false;
		return;
	}

	const target = event.currentTarget as HTMLElement;
	const rect = target.getBoundingClientRect();
	const touch = event.touches[0];
	
	if (!touch) {
		return;
	}
	
	const x = touch.clientX - rect.left;
	const percentage = Math.max(0, Math.min(1, x / rect.width));

	tooltipTime.value = percentage * currentDuration;
	tooltipPosition.value = percentage * 100;
	showTooltip.value = true;
};
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
	transition: height 0.2s ease, left 0.3s ease, right 0.3s ease;
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
	transition: width 0.1s linear;
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
	backdrop-filter: blur(10px);
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

