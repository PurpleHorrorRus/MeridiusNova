<template>
	<div class="player-right" @click.stop>
		<div class="speed-wrapper" @mouseenter="handleSpeedMouseEnter" @mouseleave="handleSpeedMouseLeave">
			<button class="btn-speed" :title="`${t('player.speed')}: x${playbackRate}`">
				{{ playbackRate }}x
			</button>
			
			<transition name="fade">
				<div v-if="showSpeedMenu" class="speed-menu">
					<button
						v-for="rate in SPEED_RATES"
						:key="rate"
						class="speed-item"
						:class="{ active: rate === playbackRate }"
						@click="playerStore.setPlaybackRate(rate)"
					>
						{{ rate }}x
					</button>
				</div>
			</transition>
		</div>

		<div class="player-controls-group">
			<button
				v-if="playerStore.song?.canAdd"
				class="btn-player-control"
				@click="handleAdd"
				:title="t('player.addToLibrary')"
			>
				<Icon name="mdi:heart-outline" size="20" />
			</button>

			<button
				v-else-if="playerStore.song && playlistStore.canDelete(playerStore.song, { canAdd: Boolean(playerStore.song.canAdd), canDelete: Boolean(playerStore.song.canDelete) })"
				class="btn-player-control"
				@click="handleDelete"
				:title="playerStore.song ? playlistStore.getDeleteTitle(playerStore.song) : ''"
			>
				<Icon name="mdi:heart" size="20" />
			</button>

			<button
				class="btn-player-control"
				:class="{ active: repeat }"
				@click="playlistStore.toggleRepeat"
				:title="repeat ? t('player.repeatOn') : t('player.repeat')"
			>
				<Icon name="mdi:repeat" size="20" />
			</button>

			<button
				class="btn-player-control"
				:class="{ active: shuffle }"
				@click="playlistStore.toggleShuffle"
				:title="t('player.shuffle')"
			>
				<Icon name="mdi:shuffle" size="20" />
			</button>

			<button
				class="btn-player-control btn-queue"
				:class="{ active: playerStore.isQueueDrawerOpen }"
				@click="playerStore.openQueueDrawer"
				:title="t('player.queue') || 'Очередь воспроизведения'"
			>
				<Icon name="mdi:playlist-music" size="20" />
				<span v-if="playlistStore.playingSongs.length > 0" class="queue-badge" v-text="queueTracksCountText" />
			</button>
		</div>

		<div class="volume-wrapper" @wheel="handleVolumeWheel">
			<button @click="playerStore.toggleMute" class="btn-mute">
				<Icon 
					v-if="!showVolumePercent"
					:name="muted ? 'mdi:volume-mute' : (volume === 0 ? 'mdi:volume-off' : (volume < 0.5 ? 'mdi:volume-low' : 'mdi:volume-high'))" 
					size="20" 
				/>
				<span v-else class="volume-percent">{{ Math.round(volume * 100) }}%</span>
			</button>
			<div 
				class="volume-slider"
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
					class="volume-range"
				/>
				<div class="volume-fill" :style="{ width: `${volume * 100}%` }"></div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from "vue";
import { storeToRefs } from "pinia";

import { usePlaylistStore } from "~/stores/playlist";
import { usePlayerStore } from "~/stores/player";
import { useModalStore } from "~/stores/modal";
import { useSettingsStore } from "~/stores/settings";

import { useStrings } from "~/composables/useStrings";

const playerStore = usePlayerStore();
const playlistStore = usePlaylistStore();
const modalStore = useModalStore();
const settingsStore = useSettingsStore();

const { playbackRate, volume, muted } = storeToRefs(playerStore);
const { repeat, shuffle } = storeToRefs(playlistStore);
const { settings } = storeToRefs(settingsStore);

const { getString } = useStrings();
const t = getString;

const volumeSliderRef = ref<HTMLElement | null>(null);
const volumeRangeInputRef = ref<HTMLInputElement | null>(null);

const showSpeedMenu = ref(false);
let speedMenuTimeout: NodeJS.Timeout | null = null;

const showVolumePercent = ref(false);
let volumePercentTimeout: NodeJS.Timeout | null = null;

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

const queueTracksCountText = computed(() => {
	const count = playlistStore.playingSongs.length;
	return count > 99 ? "99+" : String(count);
});

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

const SPEED_RATES = Object.freeze([0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]);


const handleAdd = async () => {
	if (!playerStore.song) {
		return;
	}

	await playlistStore.addSongToLibrary(playerStore.song);
};

const handleDelete = async () => {
	if (!playerStore.song) {
		return;
	}

	await playlistStore.deleteSong(playerStore.song);
};

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
	transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
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
	transition: background-color 0.2s ease, color 0.2s ease;

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
	transition: background-color 0.15s ease, color 0.15s ease;

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
	transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
	opacity: 0;
}
</style>

