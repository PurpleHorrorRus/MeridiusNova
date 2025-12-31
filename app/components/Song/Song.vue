<template>
	<div
		class="song"
		:class="{ 'playing': isPlaying, 'table-mode': isTableMode, 'restricted': isRestricted }"
		@click="handleClick"
		@contextmenu.prevent="handleContextMenu"
	>
		<div v-if="isTableMode && isPlaying" class="song-index">
			<Icon name="mdi:volume-high" size="16" />
		</div>

		<div class="song-cover">
			<Cover
				:src="audio.cover || audio.coverUrl_p || audio.coverUrl_s"
				:width="isTableMode ? 40 : 50"
				:height="isTableMode ? 40 : 50"
			/>
			<div v-if="isTableMode" class="song-cover-overlay">
				<Icon name="mdi:play" size="16" />
			</div>
		</div>

		<div class="song-info">
			<div class="song-info-title">
				<span v-html="audio.title" />
			</div>

			<div class="song-info-artist">
				<span v-html="audio.performer || audio.artist" />
			</div>
		</div>

		<div v-if="isTableMode" class="song-album">
			{{ albumName }}
		</div>

		<div class="song-actions">
			<SongActions :audio="audio" />
		</div>

		<div class="song-duration">
			<span v-if="isRestricted" class="restricted-badge" title="Трек недоступен">
				<Icon name="mdi:lock" size="14" />
			</span>
			<span v-else>{{ duration }}</span>
		</div>

		<SongContextMenu
			:show="showContextMenu"
			:audio="audio"
			:position="contextMenuPosition"
			@close="handleContextMenuClose"
		/>
	</div>
</template>

<script setup lang="ts">
import moment from "moment";
import { storeToRefs } from "pinia";

// useAudio is auto-imported from app/composables

import type { TAudio } from "~~/server/api/vk/audio/types";
import SongActions from "~/components/SongActions.vue";
import SongContextMenu from "~/components/SongContextMenu.vue";

const props = defineProps<{
	audio: TAudio;
	index?: number;
}>();

const { play, pause, resume, currentSong, isPlaying: playerIsPlaying } = useAudio();
const { playFromPlaylist, current, playing } = usePlaylist();
const { playFromQueue } = useQueue();
const playlistStore = usePlaylistStore();
const songsContext = useSongsContext();
const playerStore = usePlayerStore();
const { song: playerSong } = storeToRefs(playerStore);

const isTableMode = computed(() => props.index !== undefined);

const isRestricted = computed(() => Boolean(props.audio.is_restriction));

const showContextMenu = ref(false);
const contextMenuPosition = ref<{ x: number; y: number } | undefined>(undefined);
const contextMenuJustClosed = ref(false);

// Используем реактивную ссылку из storeToRefs для гарантии реактивности
const isPlaying = computed(() => {
	return playerSong.value?.full_id === props.audio.full_id;
});

const duration = computed(() => {
	return moment(props.audio.duration * 1000).format("mm:ss");
});

const albumName = computed(() => {
	const album = props.audio.album;

	if (!album) {
		return "-";
	}

	if (typeof album === "string") {
		return album;
	}

	if (Array.isArray(album)) {
		// Массив [owner_id, playlist_id, access_hash] - не можем показать название без дополнительного запроса
		return "-";
	}

	if (typeof album === "object" && album !== null) {
		// Объект с информацией об альбоме
		if ("title" in album && album.title) {
			return album.title;
		}
	}

	return "-";
});

const handleClick = async () => {
	if (isRestricted.value) {
		return;
	}

	// Если клик произошел сразу после закрытия контекстного меню, игнорируем его
	// Это предотвращает случайное воспроизведение трека при закрытии меню
	if (contextMenuJustClosed.value) {
		contextMenuJustClosed.value = false;
		return;
	}

	// Проверяем, является ли это тот же трек, что и текущий (даже на паузе)
	const isCurrentSong = currentSong.value?.full_id === props.audio.full_id;

	if (isCurrentSong && playerIsPlaying.value) {
		pause();
	} else if (isCurrentSong && !playerIsPlaying.value) {
		resume();
	} else {
		// Используем current плейлист (со страницы), а не playing (который может быть VK Mix)
		// Если есть current плейлист и он не VK Mix, используем playFromPlaylist
		const currentPlaylist = current.value;
		const isCurrentVkMix = currentPlaylist && (currentPlaylist.playlist_id === -9 || String(currentPlaylist.owner_id) === "vkmix");
		
		if (currentPlaylist && !isCurrentVkMix && songsContext?.value && songsContext.value.length > 0) {
			// Создаем плейлист из контекста страницы
			await playFromPlaylist(props.audio, { ...currentPlaylist, list: songsContext.value });
		} else if (playing.value && playing.value.list && playing.value.list.length > 0) {
			// Fallback: используем playing плейлист, если current нет
			const isPlayingVkMix = playing.value.playlist_id === -9 || String(playing.value.owner_id) === "vkmix";
			if (!isPlayingVkMix) {
				await playFromPlaylist(props.audio, playing.value);
			} else {
				// Если playing - VK Mix, используем контекст страницы
				await handlePlayFromContext();
			}
		} else {
			// Ищем треки из контекста страницы
			await handlePlayFromContext();
		}
	}
};

const handlePlayFromContext = async () => {
	// ПЕРВЫМ ДЕЛОМ проверяем, не находится ли трек уже в очереди воспроизведения
	// Это предотвращает очистку очереди при клике на трек из очереди
	const currentSongs = playlistStore.playingSongs;
	const existingIndex = currentSongs.findIndex((s: TAudio) => s.full_id === props.audio.full_id);
	
	if (existingIndex >= 0) {
		// Трек уже в очереди, просто обновляем индекс и воспроизводим
		console.log("[SONG] Song already in queue, updating index only", {
			songId: props.audio.full_id,
			existingIndex,
			currentIndex: playlistStore.currentIndex
		});
		
		playlistStore.setCurrentIndex(existingIndex);
		
		// Используем трек из очереди, который уже имеет все данные (включая URL)
		const songFromQueue = currentSongs[existingIndex];
		if (songFromQueue) {
			await play({ ...songFromQueue, from: "queue", manual: true } as TAudio & { from?: string; manual?: boolean });
		}
		return;
	}
	
	// Ищем треки из контекста страницы
	let contextSongs: TAudio[] = [];
	
	if (songsContext?.value && songsContext.value.length > 0) {
		contextSongs = songsContext.value;
	} else {
		// Если контекста нет, используем только текущий трек
		contextSongs = [props.audio];
	}
	
	// Если есть current плейлист (например, поиск), используем его
	const currentPlaylist = current.value;
	
	// Используем универсальный метод для воспроизведения из очереди
	await playFromQueue(props.audio, contextSongs, currentPlaylist || undefined);
};

const handleContextMenu = (event: MouseEvent) => {
	event.preventDefault();
	event.stopPropagation();

	contextMenuPosition.value = {
		x: event.clientX,
		y: event.clientY
	};

	showContextMenu.value = true;
	contextMenuJustClosed.value = false;
};

const handleContextMenuClose = () => {
	showContextMenu.value = false;
	contextMenuJustClosed.value = true;
	setTimeout(() => {
		contextMenuJustClosed.value = false;
	}, 100);
};
</script>

<style scoped lang="scss">
.song {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 10px 12px;
	border-radius: 8px;
	transition: all 0.3s ease;
	min-height: 56px;
	position: relative;

	&.playing {
		background-color: var(--hover, rgba(42, 42, 42, 0.6));
		color: var(--secondary, #e9003f);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);

		.song-index {
			color: var(--secondary, #e9003f);
		}

		.song-info-title {
			color: var(--text, #fff);
			font-weight: 500;
		}
	}

	&.restricted {
		cursor: not-allowed;
		opacity: 0.5;
		pointer-events: none;
	}

	&:not(.restricted) {
		cursor: pointer;
	}

	&:hover:not(.restricted) {
		background-color: var(--hover, rgba(42, 42, 42, 0.8));
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);

		.song-cover {
			box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
		}

		.song-cover-overlay {
			opacity: 1;
		}

		.song-index {
			opacity: 0;
		}

		.song-actions {
			opacity: 1;
			pointer-events: auto;
			max-width: 200px;
		}

		.song-info-title {
			color: var(--text, #fff);
		}
	}

	// Table layout mode
	&.table-mode {
		display: grid;
		grid-template-columns: 1fr 1fr auto 80px;
		gap: 16px;
		padding: 10px 16px;
		align-items: center;
		min-height: 56px;


		.song-cover {
			grid-column: 1;
			grid-row: 1;
		}

		.song-info {
			grid-column: 1;
			grid-row: 1;
			margin-left: 56px;
		}

		.song-album {
			grid-column: 2;
			grid-row: 1;
		}

		.song-actions {
			grid-column: 3;
			grid-row: 1;
			min-width: 0;
		}

		.song-duration {
			grid-column: 4;
			grid-row: 1;
			text-align: right;
		}

		.song-index {
			position: absolute;
			left: 16px;
			grid-column: 1;
			grid-row: 1;
		}
	}

	&-index {
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 14px;
		color: var(--text-secondary, #b3b3b3);
		transition: all 0.3s ease;
		width: 40px;
		flex-shrink: 0;

		.table-mode & {
			grid-column: 1;
			grid-row: 1;
		}
	}

	&-cover {
		position: relative;
		border-radius: 6px;
		overflow: hidden;
		flex-shrink: 0;
		width: 50px;
		height: 50px;
		transition: all 0.3s ease;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);

		.table-mode & {
			width: 40px;
			height: 40px;
		}
	}

	&-cover-overlay {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: linear-gradient(to bottom, rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.7));
		display: flex;
		align-items: center;
		justify-content: center;
		opacity: 0;
		transition: opacity 0.3s ease;
		color: var(--text, #fff);
		backdrop-filter: blur(2px);
		z-index: 1;

		:deep(svg) {
			transition: transform 0.2s ease;
		}
	}

	&:hover &-cover-overlay :deep(svg) {
		transform: scale(1.1);
	}

	&-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 4px;
		min-width: 0;
	}

	&-info-title {
		font-size: 14px;
		font-weight: 400;
		color: var(--text, #fff);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		transition: color 0.3s ease, font-weight 0.3s ease;
		line-height: 1.4;
	}

	&-info-artist {
		font-size: 13px;
		color: var(--text-secondary, #b3b3b3);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		transition: color 0.3s ease;
		line-height: 1.3;
	}

	&-album {
		font-size: 13px;
		color: var(--text-secondary, #b3b3b3);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		display: none;
		transition: color 0.3s ease;
		line-height: 1.3;

		.table-mode & {
			display: block;
		}
	}

	&-actions {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		opacity: 0;
		pointer-events: none;
		flex-shrink: 0;
		max-width: 0;
		overflow: hidden;
		transition: opacity 0.3s ease, max-width 0.3s ease;

		&:hover {
			opacity: 1;
			pointer-events: auto;
			max-width: 200px;
		}
	}

	&-duration {
		font-size: 13px;
		color: var(--text-secondary, #b3b3b3);
		font-variant-numeric: tabular-nums;
		flex-shrink: 0;
		min-width: 40px;
		display: flex;
		align-items: center;
		justify-content: flex-end;
		transition: color 0.3s ease;
	}

	.restricted-badge {
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text-secondary, #b3b3b3);
		opacity: 0.7;
		transition: opacity 0.3s ease;
	}
}

@media (max-width: 1200px) {
	.song {
		gap: 10px;
		padding: 8px 10px;

		&.table-mode {
			gap: 12px;
			padding: 8px 12px;
		}
	}

	.song-info-title {
		font-size: 13px;
	}

	.song-info-artist {
		font-size: 12px;
	}

	.song-album {
		font-size: 12px;
	}

	.song-duration {
		font-size: 12px;
	}
}

@media (max-width: 1000px) {
	.song {
		gap: 8px;
		padding: 8px 10px;
		min-height: 52px;

		&.table-mode {
			grid-template-columns: 1fr 1fr auto 70px;
			gap: 10px;
			padding: 8px 12px;
			min-height: 52px;
		}
	}

	.song-cover {
		width: 45px;
		height: 45px;

		.table-mode & {
			width: 36px;
			height: 36px;
		}
	}

	.song-info-title {
		font-size: 13px;
	}

	.song-info-artist {
		font-size: 12px;
	}

	.song-album {
		font-size: 12px;
	}

	.song-duration {
		font-size: 12px;
		min-width: 35px;
	}
}

@media (max-width: 800px) {
	.song {
		gap: 8px;
		padding: 8px 10px;
		min-height: 48px;

		&.table-mode {
			grid-template-columns: 1fr auto 60px;
			gap: 8px;
			padding: 8px 10px;
			min-height: 48px;

			.song-album {
				display: none;
			}

			.song-info {
				margin-left: 48px;
			}

			.song-actions {
				grid-column: 2;
			}

			.song-duration {
				grid-column: 3;
			}
		}
	}

	.song-cover {
		width: 40px;
		height: 40px;

		.table-mode & {
			width: 32px;
			height: 32px;
		}
	}

	.song-info-title {
		font-size: 12px;
	}

	.song-info-artist {
		font-size: 11px;
	}

	.song-duration {
		font-size: 11px;
		min-width: 30px;
	}

	.song-index {
		width: 32px;
		font-size: 12px;

		.table-mode & {
			left: 10px;
		}
	}

	.song-cover-overlay {
		:deep(svg) {
			width: 14px;
			height: 14px;
		}
	}
}

@media (max-width: 600px) {
	.song {
		gap: 6px;
		padding: 6px 8px;
		min-height: 44px;

		&.table-mode {
			grid-template-columns: 1fr auto 50px;
			gap: 6px;
			padding: 6px 8px;
			min-height: 44px;

			.song-info {
				margin-left: 40px;
			}

			.song-actions {
				grid-column: 2;
			}

			.song-duration {
				grid-column: 3;
			}
		}
	}

	.song-cover {
		width: 36px;
		height: 36px;

		.table-mode & {
			width: 28px;
			height: 28px;
		}
	}

	.song-info-title {
		font-size: 11px;
	}

	.song-info-artist {
		font-size: 10px;
	}

	.song-duration {
		font-size: 10px;
		min-width: 25px;
	}

	.song-index {
		width: 28px;
		font-size: 11px;

		.table-mode & {
			left: 8px;
		}

		:deep(svg) {
			width: 14px;
			height: 14px;
		}
	}

	.song-cover-overlay {
		:deep(svg) {
			width: 12px;
			height: 12px;
		}
	}
}
</style>
