<template>
	<div class="fullscreen-timeline">
		<div class="fullscreen-timeline-time">
			<span class="time-current-fullscreen">{{ formatTime(currentTime) }}</span>
			<span class="time-duration-fullscreen">{{ formatTime(duration) }}</span>
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
			<div class="fullscreen-timeline-fill" :style="{ width: `${progress}%` }">
				<div class="fullscreen-timeline-knob"></div>
			</div>
		</div>
		<div
			v-if="showTooltip"
			class="fullscreen-timeline-tooltip"
			:style="{ left: `${tooltipPosition}%` }"
		>
			{{ formatTime(tooltipTime) }}
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useAudio } from "~/composables/useAudio";

const { currentTime, duration, progress, seek } = useAudio();

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

const handleProgressTouchEnd = () => {
	showTooltip.value = false;
};
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
	transition: width 0.1s linear;
	box-shadow: 0 0 12px rgba(255, 255, 255, 0.5);
}

.fullscreen-timeline-track:hover .fullscreen-timeline-fill {
	background: #fff;
	box-shadow: 0 0 16px rgba(255, 255, 255, 0.7);
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
	backdrop-filter: blur(10px);
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
}

.time-duration-fullscreen {
	color: rgba(255, 255, 255, 0.7);
}
</style>

