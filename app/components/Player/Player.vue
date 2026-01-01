<template>
	<div class="player-wrapper" v-if="currentSong">
		<div class="player">
			<!-- Timeline как тонкая линия сверху -->
			<div 
				class="player-timeline" 
				@click="handleProgressClick"
				@mousemove="handleProgressHover"
				@mouseleave="showTooltip = false"
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
			<div class="player-left">
				<div class="cover-wrapper">
					<img
						:src="currentSong.cover || currentSong.coverUrl_p || '/no-cover.webp'"
						:alt="currentSong.title"
						class="cover-image"
					/>
					<div 
						class="cover-glow" 
						:style="{ backgroundImage: `url(${currentSong.cover || currentSong.coverUrl_p || '/no-cover.webp'})` }"
					></div>
				</div>
				
				<div class="track-info">
					<div class="track-title" :title="currentSong.title">
						{{ currentSong.title }}
					</div>
					<div class="track-artist" :title="currentSong.performer || currentSong.artist">
						{{ currentSong.performer || currentSong.artist }}
					</div>
				</div>
			</div>

			<div class="player-center">
			<div class="controls-row">
				<div class="main-controls">
					<button class="btn-control" @click="playPrevious" :disabled="!hasPrevious && !repeat">
						<Icon name="mdi:skip-previous" size="24" />
					</button>
					
					<button class="btn-play" @click="toggle">
						<Icon v-if="paused" name="mdi:play" size="28" />
						<Icon v-else name="mdi:pause" size="28" />
					</button>
					
					<button class="btn-control" @click="playNext" :disabled="!hasNext && !repeat">
						<Icon name="mdi:skip-next" size="24" />
					</button>
				</div>
				
				<div class="time-display">
					<span class="time-current">{{ formatTime(currentTime) }}</span>
					<span class="time-separator">/</span>
					<span class="time-duration">{{ formatTime(duration) }}</span>
				</div>
				
				<div class="secondary-controls">
				</div>
			</div>
			</div>

			<div class="player-right">
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

			<!-- Compact layout for small screens -->
			<div class="player-compact">

			<div class="compact-controls">
				<button class="btn-control-compact" @click="playPrevious" :disabled="!hasPrevious && !repeat">
					<Icon name="mdi:skip-previous" size="20" />
				</button>
				
				<button class="btn-play-compact" @click="toggle">
					<Icon v-if="paused" name="mdi:play" size="24" />
					<Icon v-else name="mdi:pause" size="24" />
				</button>
				
				<button class="btn-control-compact" @click="playNext" :disabled="!hasNext && !repeat">
					<Icon name="mdi:skip-next" size="20" />
				</button>
			</div>

			<div class="compact-track-info">
				<div class="compact-cover">
					<img
						:src="currentSong.cover || currentSong.coverUrl_p || '/no-cover.webp'"
						:alt="currentSong.title"
						class="compact-cover-image"
					/>
				</div>
				<div class="compact-track-details">
					<div class="compact-artist">{{ currentSong.performer || currentSong.artist }}</div>
					<div class="compact-title">{{ currentSong.title }}</div>
					<div class="compact-time">
						<span class="compact-time-current">{{ formatTime(currentTime) }}</span>
						<span class="compact-time-separator">/</span>
						<span class="compact-time-duration">{{ formatTime(duration) }}</span>
					</div>
				</div>
			</div>

			<div class="compact-volume" @wheel="handleVolumeWheel">
				<button @click="toggleMute" class="btn-mute-compact">
					<Icon 
						v-if="!showVolumePercent"
						:name="muted ? 'mdi:volume-mute' : (volume === 0 ? 'mdi:volume-off' : (volume < 0.5 ? 'mdi:volume-low' : 'mdi:volume-high'))" 
						size="18" 
					/>
					<span v-else class="volume-percent-compact">{{ volumePercent }}%</span>
				</button>
				<div 
					class="compact-volume-slider"
					@mousedown="handleVolumeSliderMouseDown"
				>
					<input
						type="range"
						min="0"
						max="1000"
						step="1"
						:value="volume * 1000"
						@input="handleVolumeChange"
						class="compact-volume-range"
					/>
					<div class="compact-volume-fill" :style="{ width: `${volume * 100}%` }"></div>
				</div>
			</div>

			<div class="compact-menu-wrapper">
				<button class="btn-menu" @click="showMenu = !showMenu">
					<Icon name="mdi:dots-vertical" size="20" />
				</button>
				
				<transition name="fade">
					<div v-if="showMenu" class="compact-menu" @click.stop>
					<button
						class="menu-item"
						:class="{ active: repeat }"
						@click="toggleRepeat"
					>
						<Icon :name="repeat ? 'mdi:repeat' : 'mdi:repeat-off'" size="18" />
						<span>{{ repeat ? t('player.repeatOn') : t('player.repeat') }}</span>
					</button>
						
						<button
							class="menu-item"
							:class="{ active: shuffle }"
							@click="toggleShuffle"
						>
							<Icon name="mdi:shuffle" size="18" />
							<span>{{ t('player.shuffle') }}</span>
						</button>
						
						<div class="menu-divider"></div>
						
						<div class="menu-speed">
							<div class="menu-speed-label">{{ t('player.speed') }}</div>
							<div class="menu-speed-options">
								<button
									v-for="rate in speedRates"
									:key="rate"
									class="menu-speed-item"
									:class="{ active: rate === playbackRate }"
									@click="setPlaybackRate(rate)"
								>
									{{ rate }}x
								</button>
							</div>
						</div>
					</div>
				</transition>
			</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from "vue";

// useAudio and usePlaylist are auto-imported from app/composables
const {
	currentSong,
	paused,
	currentTime,
	duration,
	volume,
	muted,
	progress,
	toggle,
	playNext: audioPlayNext,
	playPrevious: audioPlayPrevious,
	setVolume,
	toggleMute,
	seek,
	playbackRate,
	setPlaybackRate
} = useAudio();

const { addAudio, deleteAudio } = useAudioActions();
const { generateSongProps } = useSongProps();
const { removeSongFromPlaylist } = usePlaylistActions();
const { updateTrackInAllPlaces } = useUpdateTrack();
const vkStore = useVkStore();

const {
	hasNext,
	hasPrevious,
	repeat,
	current,
	playing
} = usePlaylist();

const { getString } = useStrings();
const t = getString;

const playlistStore = usePlaylistStore();
const songsContext = useSongsContext();

const showTooltip = ref(false);
const tooltipTime = ref(0);
const tooltipPosition = ref(0);
const showSpeedMenu = ref(false);
const showMenu = ref(false);
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
	// Используем currentSong из useAudio (playerStore.song), так как весь плеер зависит от него
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
	// Можно удалить из библиотеки
	if (songProps.value.canDelete) {
		return true;
	}
	
	// Можно удалить из плейлиста пользователя
	const playlist = currentPlaylist.value;
	if (playlist && playlist.playlist_id >= 0 && playlist.owner_id === vkStore.user_id) {
		return true;
	}
	
	return false;
});

const deleteTitle = computed(() => {
	const playlist = currentPlaylist.value;
	
	// Если это плейлист пользователя (не библиотека)
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

const playNext = async () => {
	await audioPlayNext();
};

const playPrevious = async () => {
	await audioPlayPrevious();
};

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


const handleVolumeChange = (event: Event) => {
	const target = event.target as HTMLInputElement;
	const newVolume = Number(target.value) / 1000;
	setVolume(newVolume);
};

const handleVolumeSliderMouseDown = (event: MouseEvent) => {
	const clickedElement = event.target as HTMLElement;
	
	if (clickedElement.tagName === 'INPUT') {
		const inputElement = clickedElement as HTMLInputElement;
		if (inputElement.type === 'range') {
			event.stopPropagation();
			return;
		}
	}

	event.preventDefault();
	event.stopPropagation();

	const slider = event.currentTarget as HTMLElement;
	const rangeInput = slider.querySelector('input[type="range"]') as HTMLInputElement;
	
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
		document.removeEventListener('mousemove', handleMouseMove);
		document.removeEventListener('mouseup', handleMouseUp);
	};

	document.addEventListener('mousemove', handleMouseMove);
	document.addEventListener('mouseup', handleMouseUp);
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

const handleClickOutside = (event: MouseEvent) => {
	const target = event.target as HTMLElement;
	
	if (!target.closest('.compact-menu-wrapper')) {
		showMenu.value = false;
	}
};

onMounted(() => {
	document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
	document.removeEventListener('click', handleClickOutside);

	if (volumePercentTimeout) {
		clearTimeout(volumePercentTimeout);
		volumePercentTimeout = null;
	}
});

const handleAdd = async () => {
	if (!currentSong.value) {
		return;
	}

	// Для API используем оригинальный owner_id (не user_id, если трек уже был добавлен)
	const audioForApi = currentSong.value.owner_id !== vkStore.user_id
		? currentSong.value
		: { ...currentSong.value, owner_id: (currentSong.value as any).original_owner_id || currentSong.value.owner_id, full_id: `${(currentSong.value as any).original_owner_id || currentSong.value.owner_id}_${currentSong.value.id}` };

	const updatedSong = await addAudio(audioForApi).catch(console.error);
	
	if (updatedSong) {
		// Обновляем оригинальный трек, сохраняя полный объект трека из библиотеки в addedSong
		// НЕ меняем owner_id и full_id, чтобы трек не потерялся
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
	
	// Определяем, удаляем из плейлиста или из библиотеки
	// Если трек добавлен в библиотеку (addedSong !== undefined), удаляем из библиотеки
	// Если трек в плейлисте пользователя (playlist_id >= 0, owner_id === user_id) и не в библиотеке - удаляем из плейлиста
	const isInLibrary = Boolean(currentSong.value.addedSong) || currentSong.value.owner_id === vkStore.user_id;
	const shouldRemoveFromPlaylist = playlist 
		&& playlist.playlist_id >= 0 
		&& playlist.owner_id === vkStore.user_id
		&& !isInLibrary
		&& !currentSong.value.addedSong;
	
	let result;
	
	if (shouldRemoveFromPlaylist) {
		// Удаляем из плейлиста
		result = await removeSongFromPlaylist(currentSong.value, playlist).catch(console.error);
		
		if (result?.success) {
			// Обновляем размер плейлиста
			if (playlist.size !== undefined) {
				playlist.size = Math.max(0, (playlist.size || 0) - 1);
			}
		}
	} else if (isInLibrary) {
		// Удаляем из библиотеки, используя трек из addedSong
		const songToDelete = currentSong.value.addedSong || currentSong.value;
		
		result = await deleteAudio(songToDelete).catch(console.error);
		
		if (result?.success) {
			// Проверяем, находимся ли мы на странице библиотеки пользователя
			// Важно: playlist - это ТЕКУЩИЙ ПЛЕЙЛИСТ ВОСПРОИЗВЕДЕНИЯ, а не плейлист на странице!
			// Поэтому проверяем ТОЛЬКО route.path, а НЕ playlist
			// Библиотека это:
			// 1. /collection (страница библиотеки)
			// 2. /playlist/USER_ID/-1 (страница плейлиста с playlist_id === -1)
			const route = useRoute();
			const isUserLibraryPage = route.path.startsWith('/collection')
				|| route.path.match(/\/playlist\/\d+\/-1$/);
			
			if (isUserLibraryPage) {
				// Если это страница библиотеки, удаляем трек из списка
				updateTrackInAllPlaces(currentSong.value.id, () => null, true);
			} else {
				// Удаляем addedSong и обновляем флаги, НЕ меняя owner_id и full_id
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
		// Обновляем состояние: удаляем трек из плейлистов и очереди
		playlistStore.removeSongByFullId(currentSong.value.full_id);
		
		// Если удаленный трек был текущим, переключаемся на следующий
		if (playlistStore.currentSong && playlistStore.currentSong.full_id === currentSong.value.full_id) {
			playlistStore.next();
		}
	}
};
</script>

<style scoped lang="scss">
.player-wrapper {
	position: fixed;
	bottom: 24px;
	left: 256px;
	right: 24px;
	z-index: 1000;
	display: flex;
	flex-direction: column;

	@media (max-width: 1400px) {
		left: 216px;
	}

	@media (max-width: 1200px) {
		left: 196px;
	}

	@media (max-width: 1000px) {
		left: 176px;
	}

	@media (max-width: 800px) {
		left: 196px;
		right: 12px;
		bottom: 12px;
	}

	@media (max-width: 700px) {
		left: 176px;
		right: 8px;
		bottom: 8px;
	}

	@media (max-width: 600px) {
		left: 96px;
		right: 4px;
		bottom: 4px;
	}
}

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

.player {
	position: relative;
	height: 96px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 0 24px;
	gap: 20px;
	background: rgba(22, 22, 22, 0.7);
	backdrop-filter: blur(25px) saturate(180%);
	-webkit-backdrop-filter: blur(25px) saturate(180%);
	border: 1px solid rgba(255, 255, 255, 0.08);
	border-radius: 20px;
	box-shadow: 
		0 20px 40px -10px rgba(0, 0, 0, 0.5),
		0 0 0 1px rgba(255, 255, 255, 0.05) inset;
	transition: all 0.3s ease;

	@media (max-width: 1400px) {
		padding: 0 16px;
		gap: 12px;
		height: 92px;
	}

	@media (max-width: 1200px) {
		padding: 0 12px;
		gap: 8px;
		height: 88px;
	}

	@media (max-width: 1000px) {
		padding: 0 8px;
		gap: 6px;
		height: 84px;
		border-radius: 16px;
	}

	@media (max-width: 800px) {
		padding: 0 6px;
		gap: 4px;
		height: 80px;
		border-radius: 16px;
	}

	@media (min-width: 801px) and (max-width: 1000px) {
		border-radius: 16px;
	}

	@media (max-width: 700px) {
		padding: 0 4px;
		gap: 4px;
		height: 76px;
		border-radius: 12px;
	}

	@media (max-width: 600px) {
		padding: 0 4px;
		gap: 4px;
		height: 72px;
		border-radius: 12px;
	}
}

/* Left Section */
.player-left {
	display: flex;
	align-items: center;
	gap: 16px;
	width: 300px;
	min-width: 0;

	@media (max-width: 1400px) {
		width: 240px;
		gap: 12px;
	}

	@media (max-width: 1200px) {
		width: 200px;
		gap: 10px;
	}

	@media (max-width: 1000px) {
		width: 160px;
		gap: 8px;
	}

	@media (max-width: 800px) {
		display: none;
	}
}

.cover-wrapper {
	position: relative;
	width: 56px;
	height: 56px;
	border-radius: 12px;
	flex-shrink: 0;
	transition: width 0.3s ease, height 0.3s ease, border-radius 0.3s ease;

	@media (max-width: 1200px) {
		width: 48px;
		height: 48px;
	}

	@media (max-width: 1000px) {
		width: 40px;
		height: 40px;
		border-radius: 8px;
	}

	@media (max-width: 800px) {
		width: 36px;
		height: 36px;
		border-radius: 6px;
	}

	@media (max-width: 700px) {
		width: 32px;
		height: 32px;
		border-radius: 6px;
	}

	@media (max-width: 600px) {
		width: 28px;
		height: 28px;
		border-radius: 4px;
	}
}

.cover-image {
	width: 100%;
	height: 100%;
	border-radius: inherit;
	object-fit: cover;
	position: relative;
	z-index: 2;
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
	transition: border-radius 0.3s ease;
}

.cover-glow {
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	width: 90%;
	height: 90%;
	background-size: cover;
	filter: blur(12px) saturate(150%);
	opacity: 0.6;
	z-index: 1;
	border-radius: 50%;
	transition: width 0.3s ease, height 0.3s ease;
}

.track-info {
	display: flex;
	flex-direction: column;
	gap: 4px;
	min-width: 0;
	justify-content: center;

	@media (max-width: 600px) {
		display: none;
	}
}

.track-title {
	font-size: 14px;
	font-weight: 600;
	color: #fff;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;

	@media (max-width: 1200px) {
		font-size: 13px;
	}

	@media (max-width: 1000px) {
		font-size: 12px;
	}

	@media (max-width: 800px) {
		font-size: 11px;
	}

	@media (max-width: 700px) {
		font-size: 10px;
	}
}

.track-artist {
	font-size: 13px;
	color: rgba(255, 255, 255, 0.6);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;

	@media (max-width: 1200px) {
		font-size: 12px;
	}

	@media (max-width: 1000px) {
		font-size: 11px;
	}

	@media (max-width: 800px) {
		font-size: 10px;
	}

	@media (max-width: 700px) {
		font-size: 9px;
	}
}

/* Center Section */
.player-center {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	flex: 1;
	max-width: 600px;

	@media (max-width: 800px) {
		display: none;
	}
}

.controls-row {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 24px;
	width: 100%;
	position: relative;

	@media (max-width: 1400px) {
		gap: 16px;
	}

	@media (max-width: 1200px) {
		gap: 12px;
	}

	@media (max-width: 1000px) {
		gap: 8px;
	}
}

.main-controls {
	display: flex;
	align-items: center;
	gap: 16px;

	@media (max-width: 1400px) {
		gap: 12px;
	}

	@media (max-width: 1200px) {
		gap: 10px;
	}

	@media (max-width: 1000px) {
		gap: 6px;
	}
}

.btn-control {
	background: none;
	border: none;
	color: rgba(255, 255, 255, 0.7);
	cursor: pointer;
	padding: 12px;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	transition: all 0.2s ease;
	min-width: 44px;
	min-height: 44px;

	@media (max-width: 1200px) {
		padding: 10px;
		min-width: 40px;
		min-height: 40px;

		:deep(svg) {
			width: 20px;
			height: 20px;
		}
	}

	@media (max-width: 1000px) {
		padding: 8px;
		min-width: 36px;
		min-height: 36px;

		:deep(svg) {
			width: 18px;
			height: 18px;
		}
	}

	&:hover:not(:disabled) {
		color: #fff;
		background: rgba(255, 255, 255, 0.1);
	}

	&:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}
}

.btn-play {
	width: 50px;
	height: 50px;
	border-radius: 50%;
	border: 1px solid rgba(255, 255, 255, 0.2);
	background: rgba(255, 255, 255, 0.15);
	backdrop-filter: blur(10px);
	color: #fff;
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	transition: all 0.2s ease;
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);

	@media (max-width: 1200px) {
		width: 46px;
		height: 46px;

		:deep(svg) {
			width: 26px;
			height: 26px;
		}
	}

	@media (max-width: 1000px) {
		width: 42px;
		height: 42px;

		:deep(svg) {
			width: 22px;
			height: 22px;
		}
	}

	&:hover {
		transform: scale(1.05);
		background: rgba(255, 255, 255, 0.25);
		border-color: rgba(255, 255, 255, 0.3);
		box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
	}

	&:active {
		transform: scale(0.95);
	}
}

.secondary-controls {
	position: absolute;
	right: 0;
	height: 100%;
	display: flex;
	align-items: center;
}

.time-display {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 6px;
	font-size: 12px;
	color: rgba(255, 255, 255, 0.7);
	font-weight: 500;
	letter-spacing: 0.5px;
	margin-left: 16px;
	white-space: nowrap;

	@media (max-width: 1400px) {
		margin-left: 12px;
	}

	@media (max-width: 1200px) {
		font-size: 11px;
		margin-left: 10px;
	}

	@media (max-width: 1000px) {
		font-size: 10px;
		margin-left: 8px;
	}

	@media (max-width: 800px) {
		display: none;
	}
}

.time-current {
	color: rgba(255, 255, 255, 0.9);
}

.time-separator {
	color: rgba(255, 255, 255, 0.4);
	margin: 0 2px;
}

.time-duration {
	color: rgba(255, 255, 255, 0.6);
}

/* Right Section */
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

/* Compact Layout */
.player-compact {
	display: none;
}

@media (max-width: 800px) {
	.player-compact {
		position: relative;
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		height: 100%;
	}


	.compact-controls {
		display: flex;
		align-items: center;
		gap: 4px;
		flex-shrink: 0;
	}

	.compact-track-info {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 8px;
		min-width: 0;
	}

	.compact-cover {
		flex-shrink: 0;
		width: 32px;
		height: 32px;
		border-radius: 4px;
		overflow: hidden;
	}

	.compact-cover-image {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.compact-track-details {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.compact-artist {
		font-size: 10px;
		color: rgba(255, 255, 255, 0.6);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		line-height: 1.2;
	}

	.compact-title {
		font-size: 11px;
		font-weight: 500;
		color: #fff;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		line-height: 1.2;
	}

	.compact-time {
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 9px;
		color: rgba(255, 255, 255, 0.6);
		margin-top: 2px;
		line-height: 1.2;
	}

	.compact-time-current {
		color: rgba(255, 255, 255, 0.8);
	}

	.compact-time-separator {
		color: rgba(255, 255, 255, 0.4);
	}

	.compact-time-duration {
		color: rgba(255, 255, 255, 0.5);
	}

	.btn-control-compact {
		background: none;
		border: none;
		color: rgba(255, 255, 255, 0.7);
		cursor: pointer;
		padding: 6px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s ease;
		min-width: 32px;
		min-height: 32px;

		&:hover:not(:disabled) {
			color: #fff;
			background: rgba(255, 255, 255, 0.1);
		}

		&:disabled {
			opacity: 0.3;
			cursor: not-allowed;
		}
	}

	.btn-play-compact {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		border: 1px solid rgba(255, 255, 255, 0.2);
		background: rgba(255, 255, 255, 0.15);
		backdrop-filter: blur(10px);
		color: #fff;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.2s ease;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);

		&:hover {
			transform: scale(1.05);
			background: rgba(255, 255, 255, 0.25);
		}

		&:active {
			transform: scale(0.95);
		}
	}


	.compact-volume {
		display: flex;
		align-items: center;
		gap: 6px;
		flex-shrink: 0;
		width: 100px;
	}

	.btn-mute-compact {
		background: none;
		border: none;
		color: rgba(255, 255, 255, 0.7);
		cursor: pointer;
		padding: 4px;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: color 0.2s ease;
		flex-shrink: 0;
		width: 26px;
		min-width: 26px;

		&:hover {
			color: #fff;
		}
	}

	.volume-percent-compact {
		font-size: 11px;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.9);
		text-align: center;
		display: inline-block;
		width: 100%;
	}

	.compact-volume-slider {
		flex: 1;
		height: 6px;
		position: relative;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 3px;
		cursor: pointer;
		margin: 0;
		padding: 0;
		box-sizing: border-box;
		overflow: visible;
	}

	.compact-volume-range {
		position: absolute;
		width: 100%;
		height: 20px;
		left: 0;
		top: 50%;
		transform: translateY(-50%);
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

	.compact-volume-range::-webkit-slider-runnable-track {
		width: 100%;
		height: 100%;
		margin: 0;
		padding: 0;
		border: 0;
	}

	.compact-volume-range::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 0;
		height: 0;
		margin: 0;
		padding: 0;
	}

	.compact-volume-range::-moz-range-track {
		width: 100%;
		height: 100%;
		margin: 0;
		padding: 0;
		border: 0;
	}

	.compact-volume-range::-moz-range-thumb {
		width: 0;
		height: 0;
		border: none;
		margin: 0;
		padding: 0;
	}

	.compact-volume-fill {
		height: 100%;
		background: rgba(255, 255, 255, 0.8);
		border-radius: 3px;
		position: absolute;
		left: 0;
		top: 0;
		pointer-events: none;
		margin: 0;
		padding: 0;
		box-sizing: border-box;
	}

	.compact-menu-wrapper {
		position: relative;
		flex-shrink: 0;
	}

	.btn-menu {
		background: none;
		border: none;
		color: rgba(255, 255, 255, 0.7);
		cursor: pointer;
		padding: 4px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		transition: all 0.2s ease;

		&:hover {
			color: #fff;
			background: rgba(255, 255, 255, 0.1);
		}
	}

	.compact-menu {
		position: absolute;
		bottom: 100%;
		right: 0;
		margin-bottom: 8px;
		background: rgba(30, 30, 30, 0.95);
		backdrop-filter: blur(20px);
		border-radius: 12px;
		padding: 8px;
		min-width: 200px;
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
		border: 1px solid rgba(255, 255, 255, 0.1);
		z-index: 1001;
	}

	.menu-item {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px 12px;
		background: none;
		border: none;
		color: rgba(255, 255, 255, 0.7);
		cursor: pointer;
		border-radius: 8px;
		transition: all 0.2s ease;
		text-align: left;

		&:hover {
			background: rgba(255, 255, 255, 0.1);
			color: #fff;
		}

		&.active {
			color: var(--secondary, #e9003f);
			background: rgba(233, 0, 63, 0.15);
		}

		span {
			font-size: 13px;
		}
	}

	.menu-divider {
		height: 1px;
		background: rgba(255, 255, 255, 0.1);
		margin: 8px 0;
	}

	.menu-speed {
		padding: 8px 0;
	}

	.menu-speed-label {
		font-size: 11px;
		color: rgba(255, 255, 255, 0.5);
		margin-bottom: 8px;
		padding: 0 12px;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.menu-speed-options {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
		padding: 0 12px;
	}

	.menu-speed-item {
		padding: 6px 12px;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 6px;
		color: rgba(255, 255, 255, 0.7);
		font-size: 12px;
		cursor: pointer;
		transition: all 0.2s ease;

		&:hover {
			background: rgba(255, 255, 255, 0.1);
			color: #fff;
		}

		&.active {
			color: var(--secondary, #e9003f);
			background: rgba(233, 0, 63, 0.15);
			border-color: var(--secondary, #e9003f);
		}
	}
}

@media (max-width: 700px) {
	.compact-cover {
		width: 28px;
		height: 28px;
	}

	.compact-artist {
		font-size: 9px;
	}

	.compact-title {
		font-size: 10px;
	}

	.compact-time {
		font-size: 8px;
	}

	.btn-play-compact {
		width: 32px;
		height: 32px;
	}

	.compact-volume {
		width: 90px;
	}
}

@media (max-width: 600px) {
	.player-compact {
		gap: 6px;
	}

	.compact-cover {
		width: 24px;
		height: 24px;
	}

	.compact-track-info {
		gap: 6px;
	}

	.compact-artist {
		font-size: 8px;
	}

	.compact-title {
		font-size: 9px;
	}

	.compact-time {
		font-size: 7px;
	}

	.compact-controls {
		gap: 2px;
	}

	.btn-control-compact {
		min-width: 28px;
		min-height: 28px;
		padding: 4px;
	}

	.btn-play-compact {
		width: 30px;
		height: 30px;
	}

	.compact-volume {
		width: 80px;
	}
}
</style>