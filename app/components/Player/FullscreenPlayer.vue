<template>
	<Transition name="fullscreen-fade">
		<div 
			v-if="isFullscreen" 
			class="fullscreen-player"
			@touchstart="handleFullscreenTouchStart"
			@touchmove="handleFullscreenTouchMove"
			@touchend="handleFullscreenTouchEnd"
		>
			<div class="fullscreen-player-content" :class="{ 'lyrics-open': showLyrics, 'queue-open': showQueue }" @click="handleContentClick">
				<button class="fullscreen-close-btn" @click.stop="toggleFullscreen">
					<Icon name="mdi:close" size="24" />
				</button>
				
				<div class="fullscreen-main-content">
					<div class="fullscreen-left-section">
						<FullscreenVolume />
						
						<FullscreenCover
							:current-song="currentSong ?? null"
							:previous-song="previousSong ?? null"
							:next-song="nextSong ?? null"
							:has-previous="hasPrevious || repeat"
							:has-next="hasNext || repeat"
							@play-previous="playPrevious"
							@play-next="playNext"
						/>
						
						<FullscreenTrackInfo :current-song="currentSong ?? null" />

						<FullscreenQueuePreview
							:show-queue="showQueue"
							:show-lyrics="showLyrics"
							:songs-count="playlistStore.playingSongs.length"
							@toggle-queue="toggleQueue"
						/>
						
						<div class="fullscreen-left-controls">
							<FullscreenTopButtons class="fullscreen-top-buttons-mobile" @toggle-lyrics="handleLyrics" />
							
							<FullscreenTimeline />
							
							<div class="fullscreen-controls-wrapper">
								<FullscreenTopButtons class="fullscreen-top-buttons-desktop" @toggle-lyrics="handleLyrics" />
								<FullscreenControls />
								<FullscreenRepeatShuffle class="fullscreen-repeat-shuffle-desktop" />
							</div>
						</div>
					</div>
					
					<FullscreenLyrics
						:show-lyrics="showLyrics"
						:current-song="currentSong ?? null"
					/>
				</div>

				<FullscreenQueue
					:show-queue="showQueue"
					:songs-count="playlistStore.playingSongs.length"
					:playing-songs="playlistStore.playingSongs"
					:current-index="playlistStore.currentIndex"
					@toggle-queue="toggleQueue"
				/>

				<FullscreenQueueIndicator
					:show-queue="showQueue"
					:songs-count="playlistStore.playingSongs.length"
					@toggle-queue="toggleQueue"
				/>
			</div>
		</div>
	</Transition>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useAudio } from "~/composables/useAudio";
import { usePlaylist } from "~/composables/usePlaylist";
import { usePlaylistStore } from "~/stores/playlist";
import { useIsMobile } from "~/composables/useIsMobile";
import { useLyrics } from "~/composables/useLyrics";
import { useQueueInfo } from "~/composables/useQueueInfo";
import FullscreenCover from "~/components/Player/FullscreenCover.vue";
import FullscreenTrackInfo from "~/components/Player/FullscreenTrackInfo.vue";
import FullscreenVolume from "~/components/Player/FullscreenVolume.vue";
import FullscreenTimeline from "~/components/Player/FullscreenTimeline.vue";
import FullscreenControls from "~/components/Player/FullscreenControls.vue";
import FullscreenTopButtons from "~/components/Player/FullscreenTopButtons.vue";
import FullscreenRepeatShuffle from "~/components/Player/FullscreenRepeatShuffle.vue";
import FullscreenLyrics from "~/components/Player/FullscreenLyrics.vue";
import FullscreenQueue from "~/components/Player/FullscreenQueue.vue";
import FullscreenQueuePreview from "~/components/Player/FullscreenQueuePreview.vue";
import FullscreenQueueIndicator from "~/components/Player/FullscreenQueueIndicator.vue";
import type { TAudio } from "~~/server/api/vk/audio/types";

const props = defineProps<{
	isFullscreen: boolean;
}>();

const emit = defineEmits<{
	toggleFullscreen: [];
}>();

const { currentSong, playNext, playPrevious } = useAudio();
const playlistStore = usePlaylistStore();
const { hasNext, hasPrevious, repeat } = usePlaylist();
const { isMobile } = useIsMobile();

const showLyrics = ref(false);
const showQueue = ref(false);

const lyrics = useLyrics(() => currentSong.value);

const previousSong = computed(() => {
	const currentIndex = playlistStore.currentIndex;
	if (currentIndex > 0 && currentIndex < playlistStore.playingSongs.length) {
		return playlistStore.playingSongs[currentIndex - 1];
	}
	if (repeat.value && playlistStore.playingSongs.length > 0) {
		return playlistStore.playingSongs[playlistStore.playingSongs.length - 1];
	}
	return null;
});

const nextSong = computed(() => {
	const currentIndex = playlistStore.currentIndex;
	if (currentIndex >= 0 && currentIndex < playlistStore.playingSongs.length - 1) {
		return playlistStore.playingSongs[currentIndex + 1];
	}
	if (repeat.value && playlistStore.playingSongs.length > 0) {
		return playlistStore.playingSongs[0];
	}
	return null;
});

// Touch events for fullscreen mode
let touchStartY = 0;
let touchStartX = 0;
let touchStartTime = 0;
let queueTouchStartY = 0;
let queueTouchStartTime = 0;
let touchStartElement: HTMLElement | null = null;
const SWIPE_THRESHOLD = 50;
const SWIPE_VELOCITY_THRESHOLD = 0.3;
const QUEUE_SWIPE_THRESHOLD = 80;

const toggleFullscreen = () => {
	emit("toggleFullscreen");
};

const handleLyrics = async () => {
	if (!currentSong.value) {
		return;
	}

	if (showLyrics.value) {
		showLyrics.value = false;
		lyrics.reset();
		return;
	}

	showLyrics.value = true;
	await lyrics.loadLyrics();
};

watch(currentSong, () => {
	if (showLyrics.value) {
		showLyrics.value = false;
		lyrics.reset();
	}
});

const toggleQueue = () => {
	showQueue.value = !showQueue.value;
};

const handleContentClick = (event: MouseEvent) => {
	if (!showQueue.value) {
		return;
	}

	const target = event.target as HTMLElement;
	const isQueueElement = target.closest(".fullscreen-queue") || target.closest(".fullscreen-queue-indicator");
	const isButton = target.closest("button");
	const isInteractive = target.closest(".fullscreen-timeline") || target.closest(".fullscreen-controls");

	if (!isQueueElement && !isButton && !isInteractive) {
		showQueue.value = false;
	}
};

const handleFullscreenTouchStart = (event: TouchEvent) => {
	if (event.touches.length === 1 && props.isFullscreen) {
		const touch = event.touches[0];
		if (touch) {
			touchStartY = touch.clientY;
			touchStartX = touch.clientX;
			touchStartTime = Date.now();
			queueTouchStartY = touch.clientY;
			queueTouchStartTime = Date.now();
			touchStartElement = event.target as HTMLElement;
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
			const queueDeltaY = touchY - queueTouchStartY;

			const target = event.target as HTMLElement;
			const isQueueTracks = target.closest(".fullscreen-queue-tracks");
			const isQueueContent = target.closest(".fullscreen-queue-content");

			if (showQueue.value) {
				if (queueDeltaY > 0 && !isQueueTracks && !isQueueContent) {
					event.preventDefault();
				}
			} else {
				if (deltaY > 0 || deltaX > 20) {
					event.preventDefault();
				}
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
			const queueDeltaY = touchEndY - queueTouchStartY;
			const queueDeltaTime = touchEndTime - queueTouchStartTime;
			const queueVelocity = queueDeltaTime > 0 ? Math.abs(queueDeltaY) / queueDeltaTime : 0;

			const target = event.target as HTMLElement;
			const isButton = target.closest("button");
			const isTimeline = target.closest(".fullscreen-timeline");

			if (isButton || isTimeline) {
				touchStartY = 0;
				touchStartX = 0;
				touchStartTime = 0;
				queueTouchStartY = 0;
				queueTouchStartTime = 0;
				touchStartElement = null;
				return;
			}

			if (showQueue.value) {
				const startElement = touchStartElement || target;
				const startedFromTracks = startElement.closest(".fullscreen-queue-tracks") || startElement.closest(".fullscreen-queue-content");
				
				if (startedFromTracks) {
					touchStartY = 0;
					touchStartX = 0;
					touchStartTime = 0;
					queueTouchStartY = 0;
					queueTouchStartTime = 0;
					touchStartElement = null;
					return;
				}

				const isSwipeDown = queueDeltaY > QUEUE_SWIPE_THRESHOLD;
				const isFastEnoughDown = queueVelocity > SWIPE_VELOCITY_THRESHOLD || queueDeltaY > QUEUE_SWIPE_THRESHOLD * 2;

				if (isSwipeDown && isFastEnoughDown) {
					showQueue.value = false;
					queueTouchStartY = 0;
					queueTouchStartTime = 0;
					touchStartElement = null;
					return;
				}
			} else {
				const absDeltaX = Math.abs(deltaX);
				const absDeltaY = Math.abs(deltaY);

				if (absDeltaY > absDeltaX && absDeltaY > SWIPE_THRESHOLD) {
					if (deltaY > 0) {
						const isSwipeDown = deltaY > SWIPE_THRESHOLD;
						const isFastEnoughDown = velocity > SWIPE_VELOCITY_THRESHOLD || deltaY > SWIPE_THRESHOLD * 2;

						if (isSwipeDown && isFastEnoughDown) {
							if (playlistStore.playingSongs.length > 0) {
								showQueue.value = true;
							} else {
								toggleFullscreen();
							}
							touchStartY = 0;
							touchStartX = 0;
							touchStartTime = 0;
							queueTouchStartY = 0;
							queueTouchStartTime = 0;
							touchStartElement = null;
							return;
						}
					} else {
						const isSwipeUp = deltaY < -QUEUE_SWIPE_THRESHOLD;
						const isFastEnoughUp = velocity > SWIPE_VELOCITY_THRESHOLD || deltaY < -QUEUE_SWIPE_THRESHOLD * 2;

						if (isSwipeUp && isFastEnoughUp) {
							showQueue.value = true;
							touchStartY = 0;
							touchStartX = 0;
							touchStartTime = 0;
							queueTouchStartY = 0;
							queueTouchStartTime = 0;
							touchStartElement = null;
							return;
						}
					}
				}
			}

			if (!showQueue.value) {
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
	}

	touchStartY = 0;
	touchStartX = 0;
	touchStartTime = 0;
	queueTouchStartY = 0;
	queueTouchStartTime = 0;
	touchStartElement = null;
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
	background: linear-gradient(135deg, rgb(18, 18, 18) 0%, rgb(30, 30, 30) 100%);
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
	padding: 40px;
	position: relative;
	transition: none;

	@media (max-width: 768px) {
		padding: 20px;
	}

	@media (max-width: 480px) {
		padding: 16px;
	}

	&.lyrics-open {
		align-items: center;
		justify-content: center;

		.fullscreen-main-content {
			flex: 0 0 auto;
		}
	}
}

.fullscreen-main-content {
	flex: 1;
	width: 100%;
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: center;
	gap: 40px;
	position: relative;
	min-height: 0;
	overflow: hidden;
	transition: none;

	@media (max-width: 768px) {
		flex-direction: column;
		gap: 24px;
	}

	@media (max-width: 480px) {
		flex-direction: column;
		gap: 16px;
	}

	.fullscreen-player-content.lyrics-open & {
		align-items: center;
		justify-content: center;
		flex: 0 0 auto;
		width: auto;
		min-width: 1360px;
		max-width: calc(100vw - 80px);
		gap: 60px;
		overflow: visible;

		@media (max-width: 1400px) {
			min-width: 0;
			max-width: calc(100vw - 80px);
			gap: 40px;
		}
	}

	.fullscreen-player-content.queue-open & {
		align-items: center;
		justify-content: center;
	}
}

.fullscreen-left-section {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 16px;
	transition: all 0.4s ease;
	flex-shrink: 0;
	flex-grow: 0;
	width: 600px;
	max-width: 600px;
	min-width: 600px;
	box-sizing: border-box;

	@media (max-width: 768px) {
		gap: 12px;
		width: 100%;
		max-width: 100%;
		min-width: 0;
	}

	@media (max-width: 480px) {
		gap: 10px;
		width: 100%;
		max-width: 100%;
		min-width: 0;
	}

	.fullscreen-player-content.lyrics-open & {
		align-items: center;
		justify-content: center;
		width: 800px;
		max-width: 800px;
		min-width: 800px;
		max-height: calc(100vh - 80px);
		margin-right: 0;
		box-sizing: border-box;
		overflow: visible;

		@media (max-width: 768px) {
			width: 100%;
			max-width: 100%;
			min-width: 0;
			max-height: calc(100vh - 40px);
			margin-right: 0;
			padding: 0 8px;
		}

		@media (max-width: 480px) {
			width: 100%;
			max-width: 100%;
			min-width: 0;
			max-height: calc(100vh - 32px);
			margin-right: 0;
			padding: 0 4px;
		}
	}
}

.fullscreen-left-controls {
	display: flex;
	flex-direction: column;
	gap: 20px;
	width: 100%;
	margin-top: 24px;
	box-sizing: border-box;

	@media (max-width: 768px) {
		gap: 16px;
		margin-top: 20px;
		padding: 0 8px;
	}

	@media (max-width: 480px) {
		gap: 12px;
		margin-top: 16px;
		padding: 0 4px;
	}
}

.fullscreen-top-buttons-mobile {
	display: flex;

	@media (min-width: 769px) {
		display: none;
	}
}

.fullscreen-top-buttons-desktop {
	display: none;

	@media (min-width: 769px) {
		display: flex;
	}
}

.fullscreen-controls-wrapper {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16px;
	width: 100%;

	@media (max-width: 768px) {
		flex-direction: column;
		gap: 0;
		justify-content: center;
	}

	:deep(.fullscreen-top-buttons-desktop) {
		flex-shrink: 0;
		justify-content: flex-start;
	}

	:deep(.fullscreen-controls) {
		flex: 0 0 auto;
		display: flex;
		justify-content: center;
		width: auto;

		@media (max-width: 768px) {
			width: 100%;
		}
	}

	:deep(.fullscreen-repeat-shuffle-desktop) {
		@media (max-width: 768px) {
			display: none;
		}
	}
}

.fullscreen-close-btn {
	position: fixed;
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
	z-index: 10001;

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

.fullscreen-player-content.queue-open .fullscreen-main-content {
	align-items: center;
	justify-content: center;
}
</style>
