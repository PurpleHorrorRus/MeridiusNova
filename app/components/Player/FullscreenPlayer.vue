<template>
	<Transition name="fullscreen-fade">
		<div 
			v-if="isFullscreen" 
			class="fullscreen-player"
			@touchstart="handleFullscreenTouchStart"
			@touchmove="handleFullscreenTouchMove"
			@touchend="handleFullscreenTouchEnd"
		>
		<div class="fullscreen-player-content" :class="{ 'lyrics-open': showLyrics }">
			<button class="fullscreen-close-btn" @click.stop="toggleFullscreen">
				<Icon name="mdi:close" size="24" />
			</button>
			
			<div class="fullscreen-main-content">
				<div class="fullscreen-left-section">
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
					
					<div class="fullscreen-cover" :key="currentSong?.full_id || currentSong?.id">
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
					
					<div v-if="!showLyrics" class="fullscreen-left-controls">
						<div v-if="isMobile" class="fullscreen-controls-top-mobile">
							<div class="fullscreen-controls-left">
								<button
									v-if="songProps.canAdd"
									class="btn-fullscreen-vk"
									@click.stop="handleAdd"
									:title="t('player.addToLibrary')"
								>
									<Icon name="mdi:heart-outline" size="24" />
								</button>

								<button
									v-else-if="canDelete"
									class="btn-fullscreen-vk"
									@click.stop="handleDelete"
									:title="deleteTitle"
								>
									<Icon name="mdi:heart" size="24" />
								</button>

								<button
									v-if="songProps.hasLyrics"
									class="btn-fullscreen-vk"
									@click.stop="handleLyrics"
									:title="t('player.lyrics') || 'Текст песни'"
								>
									<Icon name="mdi:text" size="24" />
								</button>
							</div>
						</div>
						
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
						
						<div class="fullscreen-controls">
							<div class="fullscreen-controls-main">
								<div v-if="!isMobile" class="fullscreen-controls-left">
									<button
										v-if="songProps.canAdd"
										class="btn-fullscreen-vk"
										@click.stop="handleAdd"
										:title="t('player.addToLibrary')"
									>
										<Icon name="mdi:heart-outline" size="24" />
									</button>

									<button
										v-else-if="canDelete"
										class="btn-fullscreen-vk"
										@click.stop="handleDelete"
										:title="deleteTitle"
									>
										<Icon name="mdi:heart" size="24" />
									</button>

									<button
										v-if="songProps.hasLyrics"
										class="btn-fullscreen-vk"
										@click.stop="handleLyrics"
										:title="t('player.lyrics') || 'Текст песни'"
									>
										<Icon name="mdi:text" size="24" />
									</button>
								</div>
								
								<div v-if="isMobile" class="fullscreen-controls-repeat">
									<button
										class="btn-fullscreen-control"
										:class="{ active: repeat }"
										@click.stop="toggleRepeat"
										:title="repeat ? t('player.repeatOn') : t('player.repeat')"
									>
										<Icon name="mdi:repeat" size="24" />
									</button>
								</div>
								
								<div class="fullscreen-controls-center">
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
								
								<div class="fullscreen-controls-right">
									<button
										v-if="!isMobile"
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
				</div>
				
					<div v-if="showLyrics" class="fullscreen-left-controls">
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
				
				<div class="fullscreen-controls">
					<div class="fullscreen-controls-main">
						<div class="fullscreen-controls-left">
							<button
								v-if="songProps.canAdd"
								class="btn-fullscreen-vk"
								@click.stop="handleAdd"
								:title="t('player.addToLibrary')"
							>
								<Icon name="mdi:heart-outline" size="24" />
							</button>

							<button
								v-else-if="canDelete"
								class="btn-fullscreen-vk"
								@click.stop="handleDelete"
								:title="deleteTitle"
							>
								<Icon name="mdi:heart" size="24" />
							</button>

							<button
								v-if="songProps.hasLyrics"
								class="btn-fullscreen-vk"
								@click.stop="handleLyrics"
								:title="t('player.lyrics') || 'Текст песни'"
							>
								<Icon name="mdi:text" size="24" />
							</button>
						</div>
						
						<div class="fullscreen-controls-center">
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
						
						<div class="fullscreen-controls-right">
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
				
				<Transition name="lyrics-slide">
					<div v-if="showLyrics" class="fullscreen-lyrics-section">
						<div class="fullscreen-lyrics-content" :ref="lyrics.lyricsRef">
							<div v-if="lyricsLoading" class="fullscreen-lyrics-loading">
								<LoadingSpinner />
							</div>
							
							<div v-else-if="lyricsText.length > 0" class="fullscreen-lyrics-lines">
								<div
									v-for="(line, index) in lyricsText"
									:key="index"
									:ref="el => { if (el) lyrics.lyricsLineRefs.value[index] = el as HTMLElement; }"
									class="fullscreen-lyrics-line"
									:class="{
										active: canTrack && trackActive === index,
										seekable: canTrack
									}"
									@click="lyrics.handleSeek(line)"
								>
									{{ lyrics.formatLine(line) }}
								</div>
							</div>
							
							<div v-else class="fullscreen-lyrics-empty">
								Текст песни недоступен
							</div>
							
							<div v-if="lyricsInfo?.credits" class="fullscreen-lyrics-credits">
								{{ lyricsInfo.credits }}
							</div>
						</div>
					</div>
				</Transition>
			</div>
		</div>
		</div>
	</Transition>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick, onUnmounted, watchEffect } from "vue";
import { useAudio } from "~/composables/useAudio";
import { usePlaylist } from "~/composables/usePlaylist";
import { usePlaylistStore } from "~/stores/playlist";
import { useStrings } from "~/composables/useStrings";
import { useSongProps } from "~/composables/useSongProps";
import { useModal } from "~/composables/useModal";
import { useVkStore } from "~/stores/vk";
import { useSongDelete } from "~/composables/useSongDelete";
import { useSongAdd } from "~/composables/useSongAdd";
import { useSettings } from "~/composables/useSettings";
import { useIsMobile } from "~/composables/useIsMobile";
import { useLyrics } from "~/composables/useLyrics";
import { useVolumeSlider } from "~/composables/useVolumeSlider";
import LoadingSpinner from "~/components/LoadingSpinner.vue";

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
const { hasNext, hasPrevious, repeat, current, playing } = usePlaylist();

const shuffle = computed(() => playlistStore.shuffle);

const { generateSongProps } = useSongProps();
const { openModal } = useModal();
const vkStore = useVkStore();
const { handleDelete: deleteSong, getDeleteTitle, canDelete: canDeleteSong } = useSongDelete();
const { handleAdd: addSong } = useSongAdd();
const { settings } = useSettings();

const songProps = computed(() => {
	const song = currentSong.value;
	if (!song) {
		return {
			canAdd: false,
			canDelete: false,
			hasLyrics: false
		};
	}

	return generateSongProps(song);
});

const currentPlaylist = computed(() => {
	return playing.value || current.value;
});

const canDelete = computed(() => {
	if (!currentSong.value) {
		return false;
	}

	return canDeleteSong(currentSong.value, songProps.value);
});

const deleteTitle = computed(() => {
	if (!currentSong.value) {
		return "";
	}

	return getDeleteTitle(currentSong.value);
});

const { isMobile } = useIsMobile();

const showTooltip = ref(false);
const tooltipTime = ref(0);
const tooltipPosition = ref(0);

const showLyrics = ref(false);

const lyrics = useLyrics(() => currentSong.value);
const volumeSlider = useVolumeSlider();
const lyricsLoading = computed(() => lyrics.loading.value);
const lyricsText = computed(() => lyrics.lyricsText.value);
const lyricsInfo = computed(() => lyrics.lyricsInfo.value);
const canTrack = computed(() => lyrics.canTrack.value);
const trackActive = computed(() => lyrics.trackActive.value);

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

const handleAdd = async () => {
	if (!currentSong.value) {
		return;
	}

	await addSong(currentSong.value);
};

const handleDelete = async () => {
	if (!currentSong.value) {
		return;
	}

	await deleteSong(currentSong.value);
};

const handleLyrics = async () => {
	if (!currentSong.value) {
		return;
	}

	if (isMobile.value) {
		openModal("lyrics", { audio: currentSong.value });
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
	transition: all 0.4s ease;

	@media (max-width: 768px) {
		padding: 20px;
	}

	@media (max-width: 480px) {
		padding: 16px;
	}
}

.fullscreen-main-content {
	flex: 1;
	width: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 40px;
	position: relative;
	min-height: 0;
	overflow: hidden;

	@media (max-width: 768px) {
		gap: 24px;
	}

	@media (max-width: 480px) {
		gap: 16px;
	}

	.fullscreen-player-content.lyrics-open & {
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
	width: 600px;
	max-width: 600px;
	box-sizing: border-box;

	@media (max-width: 768px) {
		gap: 12px;
		width: 100%;
		max-width: 100%;
	}

	@media (max-width: 480px) {
		gap: 10px;
		width: 100%;
		max-width: 100%;
	}

	.fullscreen-player-content.lyrics-open & {
		align-items: center;
		justify-content: center;
		width: auto;
		min-width: 300px;
		max-width: 100%;
		margin-right: 40px;
		box-sizing: border-box;

		@media (max-width: 768px) {
			min-width: 0;
			width: 100%;
			max-width: 100%;
			margin-right: 24px;
			padding: 0 8px;
		}

		@media (max-width: 480px) {
			min-width: 0;
			width: 100%;
			max-width: 100%;
			margin-right: 16px;
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

	.fullscreen-controls-top-mobile {
		display: none;

		@media (max-width: 768px) {
			display: flex;
			align-items: center;
			justify-content: flex-start;
			width: 100%;
			margin-bottom: 12px;
			order: 1;

			.fullscreen-controls-left {
				flex: 0;
				justify-content: flex-start;
				gap: 8px;
				width: auto;
			}
		}

		@media (max-width: 480px) {
			margin-bottom: 8px;

			.fullscreen-controls-left {
				gap: 6px;
			}
		}
	}

	.fullscreen-timeline {
		width: 100%;
		padding: 0;
		box-sizing: border-box;

		@media (max-width: 768px) {
			order: 2;
		}
	}

	.fullscreen-controls {
		width: 100%;
		box-sizing: border-box;
		overflow: hidden;

		@media (max-width: 768px) {
			order: 3;
		}
	}


	.fullscreen-controls-main {
		@media (max-width: 480px) {
			gap: 6px;
		}
	}

	.btn-control-fullscreen {
		@media (max-width: 480px) {
			width: 40px;
			height: 40px;
		}
	}

	.btn-play-fullscreen {
		@media (max-width: 480px) {
			width: 56px;
			height: 56px;
		}
	}

	.btn-fullscreen-vk,
	.btn-fullscreen-control {
		@media (max-width: 480px) {
			width: 32px;
			height: 32px;
		}
	}

	.fullscreen-controls-center {
		@media (max-width: 480px) {
			gap: 12px;
		}
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
	transition: all 0.4s ease;

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

	.fullscreen-player-content.lyrics-open & {
		width: 300px;
		height: 300px;

		@media (max-width: 768px) {
			width: 240px;
			height: 240px;
		}

		@media (max-width: 480px) {
			width: 200px;
			height: 200px;
		}
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
	animation: fadeIn 0.4s ease;
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
	animation: fadeIn 0.4s ease;
}

@keyframes fadeIn {
	from {
		opacity: 0;
	}
	to {
		opacity: 1;
	}
}

.fullscreen-track-info {
	text-align: center;
	width: 100%;
	max-width: 600px;
	padding: 0 20px;
	transition: all 0.4s ease;
	margin-bottom: 0;
	box-sizing: border-box;
	height: 160px;
	display: flex;
	flex-direction: column;
	justify-content: center;

	@media (max-width: 768px) {
		max-width: 100%;
		padding: 0 16px;
		width: 100%;
		height: 140px;
	}

	@media (max-width: 480px) {
		padding: 0 12px;
		height: 120px;
	}

	.fullscreen-player-content.lyrics-open & {
		text-align: left;
		max-width: 300px;
		padding: 0;

		@media (max-width: 768px) {
			max-width: 240px;
		}

		@media (max-width: 480px) {
			max-width: 200px;
		}
	}
}

.fullscreen-track-title {
	font-size: 32px;
	font-weight: 700;
	color: #fff;
	margin-bottom: 8px;
	line-height: 1.3;
	word-wrap: break-word;
	overflow: hidden;
	text-overflow: ellipsis;
	display: -webkit-box;
	-webkit-box-orient: vertical;
	max-width: 100%;
	max-height: calc(1.3em * 3);
	-webkit-line-clamp: 3;
	line-clamp: 3;

	@media (max-width: 768px) {
		font-size: 24px;
		margin-bottom: 6px;
		max-height: calc(1.3em * 3);
		-webkit-line-clamp: 3;
		line-clamp: 3;
	}

	@media (max-width: 480px) {
		font-size: 20px;
		margin-bottom: 4px;
		max-height: calc(1.3em * 3);
		-webkit-line-clamp: 3;
		line-clamp: 3;
	}
}

.fullscreen-track-artist {
	font-size: 20px;
	color: rgba(255, 255, 255, 0.7);
	line-height: 1.4;
	word-wrap: break-word;
	overflow: hidden;
	text-overflow: ellipsis;
	display: -webkit-box;
	-webkit-line-clamp: 1;
	line-clamp: 1;
	-webkit-box-orient: vertical;
	max-width: 100%;

	@media (max-width: 768px) {
		font-size: 16px;
		-webkit-line-clamp: 1;
		line-clamp: 1;
	}

	@media (max-width: 480px) {
		font-size: 14px;
		-webkit-line-clamp: 1;
		line-clamp: 1;
	}
}

.fullscreen-bottom-section {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 20px;
	width: 100%;
	flex-shrink: 0;
	padding-top: 12px;

	@media (max-width: 768px) {
		gap: 16px;
		padding-top: 8px;
	}

	@media (max-width: 480px) {
		gap: 12px;
		padding-top: 4px;
	}
}

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

.fullscreen-controls {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 20px;
	width: 100%;

	@media (max-width: 768px) {
		gap: 16px;
	}
}

.fullscreen-controls-main {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 100%;
	gap: 24px;
	box-sizing: border-box;
	position: relative;
	padding: 0 140px;

	@media (max-width: 768px) {
		flex-direction: row;
		flex-wrap: nowrap;
		gap: 12px;
		align-items: center;
		justify-content: space-between;
		padding: 0;
	}

	@media (max-width: 480px) {
		gap: 8px;
	}
}

.fullscreen-controls-left {
	display: flex;
	align-items: center;
	gap: 12px;
	flex: 0;
	justify-content: flex-start;
	position: absolute;
	left: 0;
	min-width: 120px;

	@media (max-width: 768px) {
		position: static;
		flex: 0;
		justify-content: flex-start;
		gap: 8px;
		width: auto;
		min-width: 0;
	}

	@media (max-width: 480px) {
		gap: 6px;
	}
}

.fullscreen-controls-repeat {
	display: none;

	@media (max-width: 768px) {
		display: flex;
		align-items: center;
		justify-content: flex-start;
		flex: 1;
		width: auto;
		min-width: 0;
	}

	@media (max-width: 480px) {
		flex: 1;
	}
}

.fullscreen-controls-center {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 32px;
	flex-shrink: 0;

	@media (max-width: 768px) {
		gap: 24px;
		width: auto;
		justify-content: center;
		flex: 0;
		box-sizing: border-box;
	}

	@media (max-width: 480px) {
		gap: 16px;
	}
}

.fullscreen-controls-right {
	display: flex;
	align-items: center;
	gap: 12px;
	flex: 0;
	justify-content: flex-end;
	position: absolute;
	right: 0;
	min-width: 100px;

	@media (max-width: 768px) {
		position: static;
		flex: 1;
		justify-content: flex-end;
		gap: 8px;
		width: auto;
		min-width: 0;
	}

	@media (max-width: 480px) {
		gap: 6px;
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

.btn-fullscreen-vk {
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

	&:hover {
		background: rgba(255, 255, 255, 0.15);
		color: #fff;
		transform: scale(1.05);
	}

	&:active {
		transform: scale(0.95);
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

.fullscreen-volume {
	display: flex;
	align-items: center;
	gap: 16px;
	width: 100%;
	max-width: 400px;

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
	transition: height 0.2s ease;

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

.fullscreen-lyrics-section {
	flex: 1;
	display: flex;
	flex-direction: column;
	height: 100%;
	max-width: 500px;
	background: rgba(0, 0, 0, 0.3);
	backdrop-filter: blur(20px);
	border-radius: 24px;
	padding: 24px;
	overflow: hidden;

	@media (max-width: 768px) {
		max-width: 400px;
		padding: 20px;
		border-radius: 20px;
	}

	@media (max-width: 480px) {
		max-width: 100%;
		padding: 16px;
		border-radius: 16px;
	}
}

.fullscreen-lyrics-content {
	flex: 1;
	display: flex;
	flex-direction: column;
	overflow-y: auto;
	overflow-x: hidden;
	padding-right: 8px;

	&::-webkit-scrollbar {
		width: 6px;
	}

	&::-webkit-scrollbar-track {
		background: rgba(255, 255, 255, 0.05);
		border-radius: 3px;
	}

	&::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.2);
		border-radius: 3px;

		&:hover {
			background: rgba(255, 255, 255, 0.3);
		}
	}
}

.fullscreen-lyrics-loading {
	display: flex;
	align-items: center;
	justify-content: center;
	flex: 1;
}

.fullscreen-lyrics-lines {
	display: flex;
	flex-direction: column;
	gap: 8px;
	padding: 8px 0;
}

.fullscreen-lyrics-line {
	font-size: 16px;
	line-height: 1.6;
	color: rgba(255, 255, 255, 0.6);
	transition: all 0.2s ease;
	padding: 12px 16px;
	border-radius: 8px;
	cursor: default;

	@media (max-width: 768px) {
		font-size: 15px;
		padding: 10px 14px;
	}

	@media (max-width: 480px) {
		font-size: 14px;
		padding: 8px 12px;
	}

	&.seekable {
		cursor: pointer;

		&:hover {
			background: rgba(255, 255, 255, 0.1);
			color: rgba(255, 255, 255, 0.8);
		}
	}

	&.active {
		color: #fff;
		background: rgba(255, 255, 255, 0.15);
		font-weight: 500;
	}
}

.fullscreen-lyrics-empty {
	display: flex;
	align-items: center;
	justify-content: center;
	flex: 1;
	color: rgba(255, 255, 255, 0.5);
	font-size: 16px;
	text-align: center;

	@media (max-width: 768px) {
		font-size: 14px;
	}
}

.fullscreen-lyrics-credits {
	margin-top: 20px;
	padding-top: 16px;
	border-top: 1px solid rgba(255, 255, 255, 0.1);
	color: rgba(255, 255, 255, 0.5);
	font-size: 13px;
	text-align: center;
	line-height: 1.5;

	@media (max-width: 768px) {
		margin-top: 16px;
		padding-top: 12px;
		font-size: 12px;
	}
}

.lyrics-slide-enter-active {
	animation: lyricsSlideIn 0.4s ease;
}

.lyrics-slide-leave-active {
	animation: lyricsSlideOut 0.4s ease;
}

@keyframes lyricsSlideIn {
	from {
		opacity: 0;
		transform: translateX(50px);
	}
	to {
		opacity: 1;
		transform: translateX(0);
	}
}

@keyframes lyricsSlideOut {
	from {
		opacity: 1;
		transform: translateX(0);
	}
	to {
		opacity: 0;
		transform: translateX(50px);
	}
}
</style>

