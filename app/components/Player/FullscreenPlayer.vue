<template>
	<Transition name="fullscreen-fade">
		<div 
			v-if="isFullscreen" 
			class="fullscreen-player"
			@touchstart="handleFullscreenTouchStart"
			@touchmove="handleFullscreenTouchMove"
			@touchend="handleFullscreenTouchEnd"
		>
		<div class="fullscreen-player-content">
			<button class="fullscreen-close-btn" @click.stop="toggleFullscreen">
				<Icon name="mdi:close" size="24" />
			</button>
			
			<div class="fullscreen-cover">
				<img
					:src="currentSong?.cover || currentSong?.coverUrl_p || '/no-cover.webp'"
					:alt="currentSong?.title || ''"
					class="fullscreen-cover-image"
				/>
				<div 
					class="fullscreen-cover-glow" 
					:style="{ backgroundImage: `url(${currentSong?.cover || currentSong?.coverUrl_p || '/no-cover.webp'})` }"
				></div>
			</div>
			
			<div class="fullscreen-track-info">
				<div class="fullscreen-track-title" :title="currentSong?.title || ''">
					{{ currentSong?.title || "" }}
				</div>
				<div class="fullscreen-track-artist" :title="currentSong?.performer || currentSong?.artist || ''">
					{{ currentSong?.performer || currentSong?.artist || "" }}
				</div>
			</div>
			
			<div class="fullscreen-timeline">
				<div 
					class="fullscreen-timeline-track" 
					@click="handleProgressClick"
					@mousemove="handleProgressHover"
					@mouseleave="showTooltip = false"
					@touchstart="handleProgressTouch"
					@touchmove="handleProgressTouchMove"
					@touchend="showTooltip = false"
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
			
			<div class="fullscreen-controls">
				<div class="fullscreen-controls-row">
					<button class="btn-control-fullscreen" @click.stop="playPrevious">
						<Icon name="mdi:skip-previous" size="32" />
					</button>
					
					<button class="btn-play-fullscreen" @click.stop="toggle">
						<Icon v-if="paused" name="mdi:play" size="40" />
						<Icon v-else name="mdi:pause" size="40" />
					</button>
					
					<button class="btn-control-fullscreen" @click.stop="playNext">
						<Icon name="mdi:skip-next" size="32" />
					</button>
				</div>
				
				<div class="fullscreen-time-display">
					<span class="time-current-fullscreen">{{ formatTime(currentTime) }}</span>
					<span class="time-separator-fullscreen">/</span>
					<span class="time-duration-fullscreen">{{ formatTime(duration) }}</span>
				</div>
				
				<div class="fullscreen-secondary-controls">
					<button
						class="btn-fullscreen-control"
						:class="{ active: repeat }"
						@click.stop="toggleRepeat"
						:title="repeat ? t('player.repeatOn') : t('player.repeat')"
					>
						<Icon name="mdi:repeat" size="24" />
					</button>
					
					<button
						class="btn-fullscreen-control"
						:class="{ active: shuffle }"
						@click.stop="toggleShuffle"
						:title="t('player.shuffle')"
					>
						<Icon name="mdi:shuffle" size="24" />
					</button>
				</div>
			</div>
		</div>
		</div>
	</Transition>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useAudio } from "~/composables/useAudio";
import { usePlaylist } from "~/composables/usePlaylist";
import { usePlaylistStore } from "~/stores/playlist";
import { useStrings } from "~/composables/useStrings";

const props = defineProps<{
	isFullscreen: boolean;
}>();

const emit = defineEmits<{
	toggleFullscreen: [];
}>();

const {
	currentSong,
	paused,
	currentTime,
	duration,
	progress,
	toggle,
	playNext,
	playPrevious,
	seek
} = useAudio();

const { getString } = useStrings();
const t = getString;

const playlistStore = usePlaylistStore();
const { hasNext, hasPrevious, repeat } = usePlaylist();

const shuffle = computed(() => playlistStore.shuffle);

const showTooltip = ref(false);
const tooltipTime = ref(0);
const tooltipPosition = ref(0);

// Touch events for fullscreen mode
let touchStartY = 0;
let touchStartX = 0;
let touchStartTime = 0;
const SWIPE_THRESHOLD = 50;
const SWIPE_VELOCITY_THRESHOLD = 0.3;

const formatTime = (seconds: number): string => {
	if (!isFinite(seconds) || isNaN(seconds)) {
		return "0:00";
	}

	const mins = Math.floor(seconds / 60);
	const secs = Math.floor(seconds % 60);
	return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const toggleFullscreen = () => {
	emit("toggleFullscreen");
};

const toggleRepeat = () => {
	playlistStore.toggleRepeat();
};

const toggleShuffle = () => {
	playlistStore.toggleShuffle();
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

const handleFullscreenTouchStart = (event: TouchEvent) => {
	if (event.touches.length === 1 && props.isFullscreen) {
		const touch = event.touches[0];
		if (touch) {
			touchStartY = touch.clientY;
			touchStartX = touch.clientX;
			touchStartTime = Date.now();
		}
	}
};

const handleFullscreenTouchMove = (event: TouchEvent) => {
	if (event.touches.length === 1 && props.isFullscreen) {
		const touch = event.touches[0];
		if (touch) {
			const touchY = touch.clientY;
			const touchX = touch.clientX;
			const deltaY = touchY - touchStartY;
			const deltaX = Math.abs(touchX - touchStartX);
			
			if (deltaY > 0 || deltaX > 20) {
				event.preventDefault();
			}
		}
	}
};

const handleFullscreenTouchEnd = (event: TouchEvent) => {
	if (event.changedTouches.length === 1 && props.isFullscreen) {
		const touch = event.changedTouches[0];
		if (touch) {
			const touchEndY = touch.clientY;
			const touchEndX = touch.clientX;
			const touchEndTime = Date.now();
			const deltaY = touchEndY - touchStartY;
			const deltaX = touchEndX - touchStartX;
			const deltaTime = touchEndTime - touchStartTime;
			const velocity = deltaTime > 0 ? Math.abs(deltaY) / deltaTime : 0;
			
			const target = event.target as HTMLElement;
			const isInteractiveElement = target.closest("button") || target.closest(".fullscreen-timeline");
			
			if (isInteractiveElement) {
				touchStartY = 0;
				touchStartX = 0;
				touchStartTime = 0;
				return;
			}
			
			const isSwipeDown = deltaY > SWIPE_THRESHOLD;
			const isFastEnoughDown = velocity > SWIPE_VELOCITY_THRESHOLD || deltaY > SWIPE_THRESHOLD * 2;
			
			if (isSwipeDown && isFastEnoughDown) {
				toggleFullscreen();
				touchStartY = 0;
				touchStartX = 0;
				touchStartTime = 0;
				return;
			}
			
			const absDeltaX = Math.abs(deltaX);
			const absDeltaY = Math.abs(deltaY);
			
			if (absDeltaX > absDeltaY && absDeltaX > SWIPE_THRESHOLD) {
				if (deltaX > 0) {
					if (hasPrevious.value || repeat.value) {
						playPrevious();
					}
				} else {
					if (hasNext.value || repeat.value) {
						playNext();
					}
				}
			}
		}
	}
	
	touchStartY = 0;
	touchStartX = 0;
	touchStartTime = 0;
};
</script>


<style scoped lang="scss">
.fullscreen-player {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 10000;
	background: linear-gradient(135deg, rgba(18, 18, 18, 0.98) 0%, rgba(30, 30, 30, 0.98) 100%);
	backdrop-filter: blur(30px);
	-webkit-backdrop-filter: blur(30px);
	display: flex;
	align-items: center;
	justify-content: center;
}

.fullscreen-fade-enter-active {
	animation: fadeIn 0.3s ease;
}

.fullscreen-fade-leave-active {
	animation: fadeOut 0.3s ease;
}

@keyframes fadeIn {
	from {
		opacity: 0;
	}
	to {
		opacity: 1;
	}
}

@keyframes fadeOut {
	from {
		opacity: 1;
	}
	to {
		opacity: 0;
	}
}

.fullscreen-player-content {
	width: 100%;
	height: 100%;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 40px 20px;
	gap: 40px;
	position: relative;

	@media (max-width: 768px) {
		padding: 20px 16px;
		gap: 30px;
	}

	@media (max-width: 480px) {
		padding: 16px 12px;
		gap: 24px;
	}
}

.fullscreen-close-btn {
	position: absolute;
	top: 20px;
	right: 20px;
	background: rgba(255, 255, 255, 0.1);
	border: none;
	border-radius: 50%;
	width: 44px;
	height: 44px;
	display: flex;
	align-items: center;
	justify-content: center;
	color: rgba(255, 255, 255, 0.9);
	cursor: pointer;
	transition: all 0.2s ease;
	backdrop-filter: blur(10px);
	z-index: 10;

	@media (max-width: 768px) {
		top: 16px;
		right: 16px;
		width: 40px;
		height: 40px;
	}

	@media (max-width: 480px) {
		top: 12px;
		right: 12px;
		width: 36px;
		height: 36px;
	}

	&:hover {
		background: rgba(255, 255, 255, 0.2);
		color: #fff;
		transform: scale(1.05);
	}

	&:active {
		transform: scale(0.95);
	}
}

.fullscreen-cover {
	position: relative;
	width: 400px;
	height: 400px;
	border-radius: 24px;
	overflow: hidden;
	box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
	flex-shrink: 0;
	animation: scaleIn 0.4s ease;

	@media (max-width: 768px) {
		width: 300px;
		height: 300px;
		border-radius: 20px;
	}

	@media (max-width: 480px) {
		width: 240px;
		height: 240px;
		border-radius: 16px;
	}
}

.fullscreen-fade-leave-active .fullscreen-cover {
	animation: scaleOut 0.3s ease;
}

@keyframes scaleIn {
	from {
		transform: scale(0.8);
		opacity: 0;
	}
	to {
		transform: scale(1);
		opacity: 1;
	}
}

@keyframes scaleOut {
	from {
		transform: scale(1);
		opacity: 1;
	}
	to {
		transform: scale(0.8);
		opacity: 0;
	}
}

.fullscreen-cover-image {
	width: 100%;
	height: 100%;
	object-fit: cover;
	position: relative;
	z-index: 2;
}

.fullscreen-cover-glow {
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	width: 120%;
	height: 120%;
	background-size: cover;
	filter: blur(40px) saturate(150%);
	opacity: 0.4;
	z-index: 1;
}

.fullscreen-track-info {
	text-align: center;
	max-width: 600px;
	padding: 0 20px;

	@media (max-width: 768px) {
		max-width: 100%;
		padding: 0 16px;
	}
}

.fullscreen-track-title {
	font-size: 32px;
	font-weight: 700;
	color: #fff;
	margin-bottom: 12px;
	line-height: 1.3;
	word-wrap: break-word;

	@media (max-width: 768px) {
		font-size: 24px;
		margin-bottom: 8px;
	}

	@media (max-width: 480px) {
		font-size: 20px;
		margin-bottom: 6px;
	}
}

.fullscreen-track-artist {
	font-size: 20px;
	color: rgba(255, 255, 255, 0.7);
	line-height: 1.4;
	word-wrap: break-word;

	@media (max-width: 768px) {
		font-size: 16px;
	}

	@media (max-width: 480px) {
		font-size: 14px;
	}
}

.fullscreen-timeline {
	width: 100%;
	max-width: 600px;
	padding: 0 20px;
	position: relative;

	@media (max-width: 768px) {
		max-width: 100%;
		padding: 0 16px;
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
	transition: height 0.2s ease;

	@media (max-width: 768px) {
		height: 6px;
	}

	&:hover {
		height: 10px;

		@media (max-width: 768px) {
			height: 8px;
		}
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

.fullscreen-controls {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 20px;
	width: 100%;
	max-width: 500px;

	@media (max-width: 768px) {
		gap: 16px;
		max-width: 100%;
	}
}

.fullscreen-controls-row {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 32px;

	@media (max-width: 768px) {
		gap: 24px;
	}

	@media (max-width: 480px) {
		gap: 20px;
	}
}

.btn-control-fullscreen {
	background: rgba(255, 255, 255, 0.1);
	border: none;
	border-radius: 50%;
	width: 56px;
	height: 56px;
	display: flex;
	align-items: center;
	justify-content: center;
	color: rgba(255, 255, 255, 0.9);
	cursor: pointer;
	transition: all 0.2s ease;
	backdrop-filter: blur(10px);

	@media (max-width: 768px) {
		width: 48px;
		height: 48px;
	}

	@media (max-width: 480px) {
		width: 44px;
		height: 44px;
	}

	&:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.2);
		color: #fff;
		transform: scale(1.05);
	}

	&:active:not(:disabled) {
		transform: scale(0.95);
	}

	&:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}
}

.btn-play-fullscreen {
	width: 80px;
	height: 80px;
	border-radius: 50%;
	border: 2px solid rgba(255, 255, 255, 0.3);
	background: rgba(255, 255, 255, 0.15);
	backdrop-filter: blur(15px);
	color: #fff;
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	transition: all 0.2s ease;
	box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);

	@media (max-width: 768px) {
		width: 70px;
		height: 70px;
	}

	@media (max-width: 480px) {
		width: 64px;
		height: 64px;
	}

	&:hover {
		transform: scale(1.05);
		background: rgba(255, 255, 255, 0.25);
		border-color: rgba(255, 255, 255, 0.4);
		box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
	}

	&:active {
		transform: scale(0.95);
	}
}

.fullscreen-time-display {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 8px;
	font-size: 16px;
	color: rgba(255, 255, 255, 0.8);
	font-weight: 500;
	letter-spacing: 0.5px;

	@media (max-width: 768px) {
		font-size: 14px;
	}

	@media (max-width: 480px) {
		font-size: 12px;
	}
}

.time-current-fullscreen {
	color: rgba(255, 255, 255, 0.95);
}

.time-separator-fullscreen {
	color: rgba(255, 255, 255, 0.5);
	margin: 0 4px;
}

.time-duration-fullscreen {
	color: rgba(255, 255, 255, 0.7);
}

.fullscreen-secondary-controls {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 16px;

	@media (max-width: 768px) {
		gap: 12px;
	}

	@media (max-width: 480px) {
		gap: 10px;
	}
}

.btn-fullscreen-control {
	background: rgba(255, 255, 255, 0.1);
	border: none;
	border-radius: 50%;
	width: 44px;
	height: 44px;
	display: flex;
	align-items: center;
	justify-content: center;
	color: rgba(255, 255, 255, 0.7);
	cursor: pointer;
	transition: all 0.2s ease;
	backdrop-filter: blur(10px);

	@media (max-width: 768px) {
		width: 40px;
		height: 40px;
	}

	@media (max-width: 480px) {
		width: 36px;
		height: 36px;
	}

	&:hover:not(.active) {
		background: rgba(255, 255, 255, 0.15);
		color: #fff;
	}

	&.active {
		color: var(--secondary, #e9003f);
		background: rgba(233, 0, 63, 0.2);
	}

	&:active {
		transform: scale(0.95);
	}
}
</style>

