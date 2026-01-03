<template>
	<div class="player-right" @click.stop>
		<div class="speed-wrapper" @mouseenter="handleSpeedMouseEnter" @mouseleave="handleSpeedMouseLeave">
			<button class="btn-speed" :title="`${t('player.speed')}: x${playbackRate}`">
				{{ playbackRate }}x
			</button>
			
			<transition name="fade">
				<div v-if="showSpeedMenu" class="speed-menu">
					<button
						v-for="rate in speedRates"
						:key="rate"
						class="speed-item"
						:class="{ active: rate === playbackRate }"
						@click="setPlaybackRate(rate)"
					>
						{{ rate }}x
					</button>
				</div>
			</transition>
		</div>

		<div class="player-controls-group">
			<button
				v-if="songProps.canAdd"
				class="btn-player-control"
				@click="handleAdd"
				:title="t('player.addToLibrary')"
			>
				<Icon name="mdi:heart-outline" size="20" />
			</button>

			<button
				v-else-if="canDelete"
				class="btn-player-control"
				@click="handleDelete"
				:title="deleteTitle"
			>
				<Icon name="mdi:heart" size="20" />
			</button>

			<button
				class="btn-player-control"
				:class="{ active: repeat }"
				@click="toggleRepeat"
				:title="repeat ? t('player.repeatOn') : t('player.repeat')"
			>
				<Icon name="mdi:repeat" size="20" />
			</button>

			<button
				class="btn-player-control"
				:class="{ active: shuffle }"
				@click="toggleShuffle"
				:title="t('player.shuffle')"
			>
				<Icon name="mdi:shuffle" size="20" />
			</button>

			<button
				class="btn-player-control btn-queue"
				:class="{ active: isQueueDrawerOpen }"
				@click="openQueueDrawer"
				:title="t('player.queue') || 'Очередь воспроизведения'"
			>
				<Icon name="mdi:playlist-music" size="20" />
				<span v-if="playlistStore.playingSongs.length > 0" class="queue-badge">{{ queueTracksCountText }}</span>
			</button>
		</div>

		<div class="volume-wrapper" @wheel="volumeSlider.handleVolumeWheel">
			<button @click="volumeSlider.toggleMute" class="btn-mute">
				<Icon 
					v-if="!showVolumePercent"
					:name="volumeSlider.muted.value ? 'mdi:volume-mute' : (volumeSlider.volume.value === 0 ? 'mdi:volume-off' : (volumeSlider.volume.value < 0.5 ? 'mdi:volume-low' : 'mdi:volume-high'))" 
					size="20" 
				/>
				<span v-else class="volume-percent">{{ volumePercent }}%</span>
			</button>
			<div 
				class="volume-slider"
				:ref="volumeSlider.volumeSliderRef"
				@mousedown="volumeSlider.handleVolumeSliderMouseDown"
			>
				<input
					:ref="volumeSlider.volumeRangeInputRef"
					type="range"
					min="0"
					max="1000"
					step="1"
					:value="volumeSlider.volume.value * 1000"
					@input="volumeSlider.handleVolumeChange"
					class="volume-range"
				/>
				<div class="volume-fill" :style="{ width: `${volumeSlider.volume.value * 100}%` }"></div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted, watch as watchVue } from "vue";
import { useAudio } from "~/composables/useAudio";
import { useSongProps } from "~/composables/useSongProps";
import { usePlaylist } from "~/composables/usePlaylist";
import { usePlaylistStore } from "~/stores/playlist";
import { useStrings } from "~/composables/useStrings";
import { useSongDelete } from "~/composables/useSongDelete";
import { useSongAdd } from "~/composables/useSongAdd";
import { useVolumeSlider } from "~/composables/useVolumeSlider";
import { useQueueDrawer } from "~/composables/useQueueDrawer";

const {
	currentSong,
	playbackRate,
	setPlaybackRate
} = useAudio();

const { openQueueDrawer, isQueueDrawerOpen } = useQueueDrawer();

const volumeSlider = useVolumeSlider();

const { generateSongProps } = useSongProps();
const { getString } = useStrings();
const t = getString;
const playlistStore = usePlaylistStore();
const { handleDelete: deleteSong, getDeleteTitle, canDelete: canDeleteSong } = useSongDelete();
const { handleAdd: addSong } = useSongAdd();

const {
	repeat,
	current,
	playing
} = usePlaylist();

const showSpeedMenu = ref(false);
let speedMenuTimeout: NodeJS.Timeout | null = null;

const showVolumePercent = ref(false);
let volumePercentTimeout: NodeJS.Timeout | null = null;

const volumePercent = computed(() => {
	return Math.round(volumeSlider.volume.value * 100);
});

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

watch(volumeSlider.volume, () => {
	showVolumePercentHandler();
});

const shuffle = computed(() => playlistStore.shuffle);

const queueTracksCountText = computed(() => {
	const count = playlistStore.playingSongs.length;
	return count > 99 ? "99+" : String(count);
});

const songProps = computed(() => {
	const song = currentSong.value;
	if (!song) {
		return {
			canAdd: false,
			canDelete: false
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

const toggleRepeat = () => {
	playlistStore.toggleRepeat();
};

const toggleShuffle = () => {
	playlistStore.toggleShuffle();
};

const handleSpeedMouseEnter = () => {
	if (speedMenuTimeout) {
		clearTimeout(speedMenuTimeout);
		speedMenuTimeout = null;
	}

	showSpeedMenu.value = true;
};

const handleSpeedMouseLeave = () => {
	speedMenuTimeout = setTimeout(() => {
		showSpeedMenu.value = false;
	}, 200);
};

const speedRates = computed(() => {
	const rates: number[] = [];

	for (let i = 0.5; i <= 2; i += 0.25) {
		rates.push(Number(i.toFixed(2)));
	}

	return rates;
});


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

onUnmounted(() => {
	if (volumePercentTimeout) {
		clearTimeout(volumePercentTimeout);
		volumePercentTimeout = null;
	}
});
</script>

<style scoped lang="scss">
.player-right {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: 16px;
	width: 400px;

	@media (max-width: 800px) {
		display: none;
	}

	@media (max-width: 1400px) {
		width: 400px;
		gap: 12px;
	}

	@media (max-width: 1200px) {
		width: 380px;
		gap: 10px;
	}

	@media (max-width: 1000px) {
		width: 260px;
		gap: 8px;
	}

	@media (min-width: 801px) and (max-width: 1000px) {
		width: 380px;
		gap: 10px;
	}
}

.player-controls-group {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 8px;

	@media (max-width: 1200px) {
		gap: 6px;
	}

	@media (max-width: 1000px) {
		gap: 4px;
	}
}

.btn-player-control {
	background: none;
	border: 1px solid transparent;
	cursor: pointer;
	padding: 8px;
	display: flex;
	align-items: center;
	justify-content: center;
	color: rgba(255, 255, 255, 0.6);
	transition: all 0.2s ease;
	border-radius: 50%;

	@media (max-width: 1200px) {
		padding: 6px;

		:deep(svg) {
			width: 18px;
			height: 18px;
		}
	}

	@media (max-width: 1000px) {
		padding: 4px;

		:deep(svg) {
			width: 16px;
			height: 16px;
		}
	}

	&:hover:not(.active) {
		color: #fff;
		background: rgba(255, 255, 255, 0.1);
	}

	&.active {
		color: var(--secondary, #e9003f);
		background: rgba(233, 0, 63, 0.15);
	}
}

.btn-queue {
	position: relative;
}

.queue-badge {
	position: absolute;
	top: -2px;
	right: -2px;
	background: var(--secondary, #e9003f);
	color: #fff;
	font-size: 10px;
	font-weight: 600;
	padding: 2px 5px;
	border-radius: 10px;
	min-width: 18px;
	height: 18px;
	display: flex;
	align-items: center;
	justify-content: center;
	line-height: 1;
	box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);

	@media (max-width: 1200px) {
		font-size: 9px;
		padding: 1px 4px;
		min-width: 16px;
		height: 16px;
	}

	@media (max-width: 1000px) {
		font-size: 8px;
		padding: 1px 3px;
		min-width: 14px;
		height: 14px;
	}
}

.speed-wrapper {
	position: relative;
}

.btn-speed {
	background: rgba(255, 255, 255, 0.1);
	border: none;
	border-radius: 6px;
	padding: 4px 10px;
	color: rgba(255, 255, 255, 0.8);
	font-size: 12px;
	font-weight: 500;
	cursor: pointer;
	transition: all 0.2s ease;

	@media (max-width: 1200px) {
		padding: 3px 8px;
		font-size: 11px;
	}

	@media (max-width: 1000px) {
		padding: 2px 6px;
		font-size: 10px;
	}

	&:hover {
		background: rgba(255, 255, 255, 0.15);
		color: #fff;
	}
}

.speed-menu {
	position: absolute;
	bottom: 100%;
	right: 0;
	margin-bottom: 12px;
	background: rgba(30, 30, 30, 0.9);
	backdrop-filter: blur(12px);
	border-radius: 12px;
	padding: 6px;
	display: flex;
	flex-direction: column;
	gap: 2px;
	box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
	border: 1px solid rgba(255, 255, 255, 0.1);
	min-width: 80px;
}

.speed-item {
	background: none;
	border: none;
	color: rgba(255, 255, 255, 0.7);
	padding: 8px 12px;
	font-size: 13px;
	cursor: pointer;
	border-radius: 6px;
	text-align: left;
	transition: all 0.15s ease;

	&:hover {
		background: rgba(255, 255, 255, 0.1);
		color: #fff;
	}

	&.active {
		color: var(--secondary, #e9003f);
		background: rgba(255, 255, 255, 0.05);
	}
}

.volume-wrapper {
	display: flex;
	align-items: center;
	gap: 8px;
	width: 240px;
}

.btn-mute {
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

.volume-percent {
	font-size: 12px;
	font-weight: 500;
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

.volume-slider {
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
}

.volume-range {
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

.volume-range::-webkit-slider-runnable-track {
	width: 100%;
	height: 100%;
	margin: 0;
	padding: 0;
	border: 0;
}

.volume-range::-webkit-slider-thumb {
	-webkit-appearance: none;
	appearance: none;
	width: 0;
	height: 0;
	margin: 0;
	padding: 0;
}

.volume-range::-moz-range-track {
	width: 100%;
	height: 100%;
	margin: 0;
	padding: 0;
	border: 0;
}

.volume-range::-moz-range-thumb {
	width: 0;
	height: 0;
	border: none;
	margin: 0;
	padding: 0;
}

.volume-fill {
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
}

.fade-enter-active,
.fade-leave-active {
	transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
	opacity: 0;
	transform: translateY(5px);
}
</style>

