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
				<Icon name="mdi:plus" size="20" />
			</button>

			<button
				v-else-if="canDelete"
				class="btn-player-control"
				@click="handleDelete"
				:title="deleteTitle"
			>
				<Icon name="mdi:close" size="20" />
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
		</div>

		<div class="volume-wrapper" @wheel="handleVolumeWheel">
			<button @click="toggleMute" class="btn-mute">
				<Icon 
					v-if="!showVolumePercent"
					:name="muted ? 'mdi:volume-mute' : (volume === 0 ? 'mdi:volume-off' : (volume < 0.5 ? 'mdi:volume-low' : 'mdi:volume-high'))" 
					size="20" 
				/>
				<span v-else class="volume-percent">{{ volumePercent }}%</span>
			</button>
			<div 
				class="volume-slider"
				@mousedown="handleVolumeSliderMouseDown"
			>
				<input
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
import { useAudio } from "~/composables/useAudio";
import { useAudioActions } from "~/composables/useAudioActions";
import { useSongProps } from "~/composables/useSongProps";
import { usePlaylistActions } from "~/composables/usePlaylistActions";
import { usePlaylist } from "~/composables/usePlaylist";
import { usePlaylistStore } from "~/stores/playlist";
import { useVkStore } from "~/stores/vk";
import { useStrings } from "~/composables/useStrings";
import { useUpdateTrack } from "~/composables/useUpdateTrack";
import { useRoute } from "vue-router";
import { useSettingsStore } from "~/stores/settings";

const {
	currentSong,
	volume,
	muted,
	playbackRate,
	setVolume,
	toggleMute,
	setPlaybackRate
} = useAudio();

const { addAudio, deleteAudio } = useAudioActions();
const { generateSongProps } = useSongProps();
const { removeSongFromPlaylist } = usePlaylistActions();
const vkStore = useVkStore();
const { getString } = useStrings();
const t = getString;
const playlistStore = usePlaylistStore();
const { updateTrackInAllPlaces } = useUpdateTrack();

const {
	hasNext,
	hasPrevious,
	repeat,
	current,
	playing
} = usePlaylist();

const showSpeedMenu = ref(false);
let speedMenuTimeout: NodeJS.Timeout | null = null;

const showVolumePercent = ref(false);
let volumePercentTimeout: NodeJS.Timeout | null = null;

const volumePercent = computed(() => {
	return Math.round(volume.value * 100);
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

watch(volume, () => {
	showVolumePercentHandler();
});

const shuffle = computed(() => playlistStore.shuffle);

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
	if (songProps.value.canDelete) {
		return true;
	}
	
	const playlist = currentPlaylist.value;
	if (playlist && playlist.playlist_id >= 0 && playlist.owner_id === vkStore.user_id) {
		return true;
	}
	
	return false;
});

const deleteTitle = computed(() => {
	const playlist = currentPlaylist.value;
	
	if (playlist && playlist.playlist_id >= 0 && playlist.owner_id === vkStore.user_id) {
		return t("player.removeFromPlaylist") || "Удалить из плейлиста";
	}
	
	return t("player.removeFromLibrary") || "Удалить из библиотеки";
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

const handleVolumeChange = (event: Event) => {
	const target = event.target as HTMLInputElement;
	const newVolume = Number(target.value) / 1000;
	setVolume(newVolume);
};

const handleVolumeSliderMouseDown = (event: MouseEvent) => {
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

	const slider = event.currentTarget as HTMLElement;
	const rangeInput = slider.querySelector("input[type=\"range\"]") as HTMLInputElement;
	
	if (!rangeInput) {
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
	setVolume(newVolume);

	const handleMouseMove = (moveEvent: MouseEvent) => {
		const moveOffsetX = getOffsetX(moveEvent);
		const moveWidth = slider.clientWidth;
		const movePercentage = Math.max(0, Math.min(1, moveOffsetX / moveWidth));
		const moveValue = Math.round(movePercentage * 1000);
		const moveVolume = moveValue / 1000;
		
		rangeInput.value = String(moveValue);
		setVolume(moveVolume);
	};

	const handleMouseUp = () => {
		document.removeEventListener("mousemove", handleMouseMove);
		document.removeEventListener("mouseup", handleMouseUp);
	};

	document.addEventListener("mousemove", handleMouseMove);
	document.addEventListener("mouseup", handleMouseUp);
};

const handleVolumeWheel = (event: WheelEvent) => {
	event.preventDefault();
	event.stopPropagation();

	const settingsStore = useSettingsStore();
	const hasWheelStep = settingsStore.settings
		&& settingsStore.settings.player
		&& settingsStore.settings.player.step
		&& settingsStore.settings.player.step.wheel;
	const wheelStepValue = hasWheelStep
		? settingsStore.settings.player.step.wheel
		: 1;
	const wheelStep = wheelStepValue / 100;
	const delta = event.deltaY > 0 ? -wheelStep : wheelStep;
	const newVolume = Math.max(0, Math.min(1, volume.value + delta));

	setVolume(newVolume);
};

const handleAdd = async () => {
	if (!currentSong.value) {
		return;
	}

	const audioForApi = currentSong.value.owner_id !== vkStore.user_id
		? currentSong.value
		: { ...currentSong.value, owner_id: (currentSong.value as any).original_owner_id || currentSong.value.owner_id, full_id: `${(currentSong.value as any).original_owner_id || currentSong.value.owner_id}_${currentSong.value.id}` };

	const updatedSong = await addAudio(audioForApi).catch(console.error);
	
	if (updatedSong) {
		const updatedTrack = {
			...currentSong.value,
			addedSong: updatedSong,
			can_add: updatedSong.can_add,
			can_delete: updatedSong.can_delete
		};
		
		updateTrackInAllPlaces(currentSong.value.id, () => updatedTrack, false);
	}
};

const handleDelete = async () => {
	if (!currentSong.value) {
		return;
	}

	const playlist = currentPlaylist.value;
	
	const isInLibrary = Boolean(currentSong.value.addedSong) || currentSong.value.owner_id === vkStore.user_id;
	const shouldRemoveFromPlaylist = playlist 
		&& playlist.playlist_id >= 0 
		&& playlist.owner_id === vkStore.user_id
		&& !isInLibrary
		&& !currentSong.value.addedSong;
	
	let result;
	
	if (shouldRemoveFromPlaylist) {
		result = await removeSongFromPlaylist(currentSong.value, playlist).catch(console.error);
		
		if (result?.success) {
			if (playlist.size !== undefined) {
				playlist.size = Math.max(0, (playlist.size || 0) - 1);
			}
		}
	} else if (isInLibrary) {
		const songToDelete = currentSong.value.addedSong || currentSong.value;
		
		result = await deleteAudio(songToDelete).catch(console.error);
		
		if (result?.success) {
			const route = useRoute();
			const isUserLibraryPage = route.path.startsWith("/collection")
				|| route.path.match(/\/playlist\/\d+\/-1$/);
			
			if (isUserLibraryPage) {
				updateTrackInAllPlaces(currentSong.value.id, () => null, true);
			} else {
				updateTrackInAllPlaces(currentSong.value.id, (track) => {
					const { addedSong, ...trackWithoutAddedSong } = track;
					return {
						...trackWithoutAddedSong,
						can_add: true,
						can_delete: false
					};
				}, false);
			}
		}
	}
	
	if (result?.success) {
		playlistStore.removeSongByFullId(currentSong.value.full_id);
		
		if (playlistStore.currentSong && playlistStore.currentSong.full_id === currentSong.value.full_id) {
			playlistStore.next();
		}
	}
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
	width: 300px;

	@media (max-width: 800px) {
		display: none;
	}

	@media (max-width: 1400px) {
		width: 300px;
		gap: 12px;
	}

	@media (max-width: 1200px) {
		width: 280px;
		gap: 10px;
	}

	@media (max-width: 1000px) {
		width: 160px;
		gap: 8px;
	}

	@media (min-width: 801px) and (max-width: 1000px) {
		width: 280px;
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
	width: 140px;
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

