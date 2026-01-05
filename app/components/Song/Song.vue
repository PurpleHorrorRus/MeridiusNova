<template>
	<div
		class="song"
		:class="{ 'playing': isPlaying, 'table-mode': isTableMode, 'restricted': isRestricted }"
		@click="handleClick"
		@contextmenu.prevent="handleContextMenu"
		@touchstart="handleTouchStart"
		@touchmove="handleTouchMove"
		@touchend="handleTouchEnd"
		@touchcancel="handleTouchCancel"
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
				<Icon :name="isPlaying && playerIsPlaying ? 'mdi:pause' : 'mdi:play'" size="16" />
			</div>

			<div v-if="isPlaying && playerIsPlaying" class="song-cover-playing-indicator">
				<Icon name="mdi:volume-high" size="10" />
			</div>
		</div>

		<div class="song-info">
			<div class="song-info-title">
				<span v-html="audio.title" />
			</div>

		<div class="song-info-artist">
			<template v-if="audio.artists && audio.artists.length > 0">
				<template v-for="(artistItem, index) in audio.artists" :key="artistItem.id || index">
					<span
						class="artist-link"
						:class="{ 'clickable': canNavigateToArtist(artistItem) }"
						@click.stop="handleArtistClick(artistItem)"
						v-html="artistItem.name"
					/>
					<span v-if="index < audio.artists.length - 1" class="artist-separator">, </span>
				</template>
			</template>
			<template v-if="audio.feat && audio.feat.length > 0">
				<span class="feat-label"> feat. </span>
				<template v-for="(featItem, index) in audio.feat" :key="featItem.id || index">
					<span
						class="artist-link feat-artist"
						:class="{ 'clickable': canNavigateToArtist(featItem) }"
						@click.stop="handleArtistClick(featItem)"
						v-html="featItem.name"
					/>
					<span v-if="index < audio.feat.length - 1" class="artist-separator">, </span>
				</template>
			</template>
			<template v-if="(!audio.artists || audio.artists.length === 0) && (!audio.feat || audio.feat.length === 0)">
				<span v-html="audio.performer || audio.artist" />
			</template>
		</div>

		<div v-if="!isTableMode && albumName" class="song-info-album" @click.stop="handleAlbumClick">
			{{ albumName }}
		</div>
	</div>

	<div v-if="isTableMode && albumName" class="song-album" @click.stop="handleAlbumClick">
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
import { inject } from "vue";
import { storeToRefs } from "pinia";

import SongActions from "~/components/SongActions.vue";
import SongContextMenu from "~/components/SongContextMenu.vue";
import { useModal } from "~/composables/useModal";

import type { TAudio } from "~~/server/api/vk/audio/types";
import type { TPlaylist } from "~~/server/utils/types";

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
const { isMobile } = useIsMobile();
const { openModal } = useModal();

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
		return "";
	}

	if (typeof album === "string") {
		return album;
	}

	if (typeof album === "object" && album !== null && !Array.isArray(album)) {
		// Объект с информацией об альбоме
		const albumObject = album as any;
		if (albumObject.title) {
			return String(albumObject.title);
		}
	}

	// Массив [owner_id, playlist_id, access_hash] или объект без title - не показываем ничего
	// Альбом будет обогащен через enrichAlbums и получит title
	return "";
});

const albumInfo = computed(() => {
	const album = props.audio.album;

	if (!album) {
		return null;
	}

	if (typeof album === "object" && album !== null && !Array.isArray(album)) {
		const albumObject = album as any;
		const ownerId = albumObject.owner_id || albumObject.ownerId;
		const playlistId = albumObject.id || albumObject.playlist_id;

		if (ownerId !== undefined && ownerId !== null && playlistId !== undefined && playlistId !== null) {
			return {
				owner_id: Number(ownerId),
				playlist_id: Number(playlistId),
				access_hash: albumObject.access_hash || albumObject.access_key || ""
			};
		}
	}

	if (Array.isArray(album) && album.length >= 2) {
		const ownerId = album[0];
		const playlistId = album[1];
		const accessHash = album[2] || "";

		if (ownerId !== undefined && ownerId !== null && playlistId !== undefined && playlistId !== null) {
			return {
				owner_id: Number(ownerId),
				playlist_id: Number(playlistId),
				access_hash: String(accessHash)
			};
		}
	}

	return null;
});

const handleAlbumClick = () => {
	if (!albumInfo.value) {
		return;
	}

	const route = `/playlist/${albumInfo.value.owner_id}/${albumInfo.value.playlist_id}`;
	const query = albumInfo.value.access_hash ? { access_hash: albumInfo.value.access_hash } : {};

	navigateTo({
		path: route,
		query
	});
};

const canNavigateToArtist = (artist: { id?: string; link?: string }): boolean => {
	return Boolean(artist.id || artist.link);
};

const handleArtistClick = (artist: { id?: string; link?: string; name?: string }) => {
	if (!canNavigateToArtist(artist)) {
		return;
	}

	const artistId = artist.id || artist.link;
	if (artistId) {
		navigateTo(`/artist/${artistId}`);
	}
};

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
		// Пытаемся получить плейлист из контекста страницы
		const playlistInfo = inject<Ref<TPlaylist | null> | undefined>("playlistInfo", undefined);
		const pagePlaylist = playlistInfo?.value;
		
		// Используем плейлист из контекста страницы, если он есть
		// Для библиотек пользователей (playlist_id === -1) проверяем owner_id, чтобы не использовать плейлист другого пользователя
		// Для обычных плейлистов используем плейлист из контекста страницы для корректного переключения
		const isUserLibrary = pagePlaylist && pagePlaylist.playlist_id === -1;
		const usePagePlaylist = pagePlaylist && (!isUserLibrary || pagePlaylist.owner_id === props.audio.owner_id);
		
		// Используем плейлист из контекста страницы, если он соответствует треку
		// Иначе используем current плейлист из store
		const currentPlaylist = usePagePlaylist ? pagePlaylist : current.value;
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
		playlistStore.setCurrentIndex(existingIndex);
		
		// Используем трек из очереди, который уже имеет все данные (включая URL)
		const songFromQueue = currentSongs[existingIndex];

		if (songFromQueue) {
			await play({
				...songFromQueue,
				from: "queue",
				manual: true
			} as TAudio & { from?: string; manual?: boolean });
		}

		return;
	}
	
	// Ищем треки из контекста страницы или плейлиста
	let contextSongs: TAudio[] = [];
	let playlistToUse: TPlaylist | undefined = undefined;
	const currentPlaylist = current.value;
	const playingPlaylist = playing.value;
	
	// Приоритет 1: контекст страницы
	if (songsContext?.value && songsContext.value.length > 0) {
		contextSongs = songsContext.value;
		
		// Если есть current плейлист и это плейлист поиска, используем его
		if (currentPlaylist && currentPlaylist.raw_id.startsWith("search_")) {
			playlistToUse = { ...currentPlaylist, list: contextSongs };
		}
		// Иначе, если есть current плейлист, используем его (для переключения плейлистов)
		// Для библиотек пользователей (playlist_id === -1) проверяем owner_id
		else if (currentPlaylist) {
			const isUserLibrary = currentPlaylist.playlist_id === -1;
			if (!isUserLibrary || currentPlaylist.owner_id === props.audio.owner_id) {
				playlistToUse = { ...currentPlaylist, list: contextSongs };
			}
		}
	}
	// Приоритет 2: current плейлист с треками
	else if (currentPlaylist?.list && currentPlaylist.list.length > 0) {
		contextSongs = currentPlaylist.list;
		playlistToUse = currentPlaylist;
	}
	// Приоритет 3: playing плейлист с треками
	else if (playingPlaylist?.list && playingPlaylist.list.length > 0) {
		contextSongs = playingPlaylist.list;
		playlistToUse = playingPlaylist;
	}
	// Приоритет 4: если есть current плейлист, но нет list, загружаем его
	else if (currentPlaylist && currentPlaylist.owner_id && currentPlaylist.playlist_id) {

		const { playFromPlaylist: playFromPlaylistFn } = usePlaylist();
		await playFromPlaylistFn(props.audio, currentPlaylist);
		return;
	}
	// Приоритет 5: если есть playing плейлист, но нет list, загружаем его
	else if (playingPlaylist && playingPlaylist.owner_id && playingPlaylist.playlist_id) {

		const { playFromPlaylist: playFromPlaylistFn } = usePlaylist();
		await playFromPlaylistFn(props.audio, playingPlaylist);
		return;
	}
	// Приоритет 6: проверяем route - может быть мы на странице плейлиста
	else {
		const route = useRoute();
		const ownerId = route.params.owner_id ? Number(route.params.owner_id) : null;
		const playlistId = route.params.playlist_id ? Number(route.params.playlist_id) : null;
		
		if (ownerId !== null && playlistId !== null && playlistId !== -1) {
			// Мы на странице плейлиста, загружаем его
			const { playFromPlaylist: playFromPlaylistFn } = usePlaylist();

			await playFromPlaylistFn(props.audio, {
				owner_id: ownerId,
				playlist_id: playlistId,
				raw_id: `${ownerId}_${playlistId}`,
				title: "",
				cover_url: "",
				description: "",
				size: 0,
				listens: 0,
				last_updated: 0,
				explicit: false,
				followed: false,
				official: false,
				restricted: false,
				access_hash: route.query.access_hash as string || "",
				follow_hash: "",
				edit_hash: "",
				list: []
			});

			return;
		}
		
		// Приоритет 7: только текущий трек (fallback)
		contextSongs = [props.audio];
	}
	
	// Используем универсальный метод для воспроизведения из очереди
	// Если playlistToUse не установлен, используем current или playing плейлист
	await playFromQueue(props.audio, contextSongs, playlistToUse || currentPlaylist || playingPlaylist || undefined);
};

const handleContextMenu = (event: MouseEvent) => {
	// На мобильных устройствах используем долгое нажатие для открытия модального окна
	if (isMobile.value) {
		return;
	}

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

let touchStartTime = 0;
let touchStartX = 0;
let touchStartY = 0;
let longPressTimer: NodeJS.Timeout | null = null;
const LONG_PRESS_DURATION = 500;
const MOVE_THRESHOLD = 10;
let isLongPress = false;

const handleTouchStart = (event: TouchEvent) => {
	if (!isMobile.value || isRestricted.value) {
		return;
	}

	const touch = event.touches[0];
	if (touch) {
		touchStartTime = Date.now();
		touchStartX = touch.clientX;
		touchStartY = touch.clientY;
		isLongPress = false;

		longPressTimer = setTimeout(() => {
			isLongPress = true;
			openModal("songActions", { audio: props.audio });
		}, LONG_PRESS_DURATION);
	}
};

const handleTouchMove = (event: TouchEvent) => {
	if (!isMobile.value || !longPressTimer) {
		return;
	}

	const touch = event.touches[0];
	if (touch) {
		const deltaX = Math.abs(touch.clientX - touchStartX);
		const deltaY = Math.abs(touch.clientY - touchStartY);

		if (deltaX > MOVE_THRESHOLD || deltaY > MOVE_THRESHOLD) {
			if (longPressTimer) {
				clearTimeout(longPressTimer);
				longPressTimer = null;
			}
		}
	}
};

const handleTouchEnd = (event: TouchEvent) => {
	if (longPressTimer) {
		clearTimeout(longPressTimer);
		longPressTimer = null;
	}

	// Если был долгий тап, предотвращаем обычный клик
	if (isLongPress) {
		event.preventDefault();
		isLongPress = false;
	}
};

const handleTouchCancel = () => {
	if (longPressTimer) {
		clearTimeout(longPressTimer);
		longPressTimer = null;
	}
};
</script>

<style scoped lang="scss">
.song {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 10px 12px;
	border-radius: 8px;
	// Анимируем только свойства, которые меняются при hover
	transition: background-color 0.3s ease;
	min-height: 56px;
	position: relative;
	overflow: hidden;
	width: 100%;

	&.playing {
		background-color: rgba(233, 0, 63, 0.08);

		.song-index {
			color: var(--secondary, #e9003f);
		}

		.song-info-title {
			color: var(--secondary, #e9003f);
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

	&:hover:not(.restricted):not(.playing) {
		background-color: rgba(255, 255, 255, 0.05);

		.song-cover-overlay {
			opacity: 1;
		}

		.song-index {
			opacity: 0;
		}

		.song-info-title {
			color: var(--text, #fff);
		}
	}

	&:hover:not(.restricted).playing {
		background-color: rgba(233, 0, 63, 0.12);

		.song-cover-overlay {
			opacity: 1;
		}

		.song-index {
			opacity: 0;
		}

		.song-info-title {
			color: var(--secondary, #e9003f);
		}
	}

	// Общие стили для .song-actions при hover (объединены для избежания дублирования)
	&:hover:not(.restricted) {
		.song-actions {
			opacity: 1;
			pointer-events: auto;
			max-width: 200px;

			.table-mode & {
				max-width: none;
			}
		}
	}

	// Table layout mode
	&.table-mode {
		display: grid;
		grid-template-columns: 1fr 1fr 80px;
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
			position: absolute;
			right: 96px;
			top: 50%;
			transform: translateY(-50%);
			min-width: 0;
			max-width: none !important;
			overflow: visible !important;
			opacity: 0;
			pointer-events: none;
		}

		.song-duration {
			grid-column: 3;
			grid-row: 1;
			text-align: right;
		}
	}

	&.table-mode:hover:not(.restricted) {
		.song-actions {
			opacity: 1;
			pointer-events: auto;
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
		transition: opacity 0.3s ease, color 0.3s ease;
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
		// Анимация не нужна - размеры не меняются

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

	&-cover-playing-indicator {
		position: absolute;
		bottom: 4px;
		right: 4px;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 18px;
		height: 18px;
		z-index: 1;
		pointer-events: none;
		background: var(--secondary, #e9003f);
		border-radius: 50%;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
		
		:deep(svg) {
			color: var(--text, #fff);
		}
	}

	&-info {
		flex: 1 1 0;
		display: flex;
		flex-direction: column;
		gap: 4px;
		min-width: 0;
		overflow: hidden;
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
		min-width: 0;
	}

	&-info-artist {
		font-size: 13px;
		color: var(--text-secondary, #b3b3b3);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		transition: color 0.3s ease;
		line-height: 1.3;
		min-width: 0;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0;

		.artist-link {
			&.clickable {
				cursor: pointer;
				transition: color 0.2s ease;

				&:hover {
					color: var(--text, #fff);
					text-decoration: underline;
				}
			}
		}

		.artist-separator {
			margin: 0 2px;
		}

		.feat-label {
			margin: 0 4px;
			opacity: 0.7;
		}

		.feat-artist {
			opacity: 0.9;
		}
	}

	&-info-album {
		font-size: 12px;
		color: var(--text-secondary, #b3b3b3);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		transition: color 0.3s ease;
		line-height: 1.2;
		opacity: 0.8;
		cursor: pointer;
		min-width: 0;
		flex-shrink: 1;

		&:hover {
			color: var(--text, #fff);
			text-decoration: underline;
		}
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
		cursor: pointer;
		min-width: 0;
		max-width: 100%;

		.table-mode & {
			display: block;
			max-width: 200px;
		}

		&:hover {
			color: var(--text, #fff);
			text-decoration: underline;
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
		transition: opacity 0.3s ease;

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

@media (max-width: 768px) {
	.song-actions {
		display: none !important;
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

	.song-info-album {
		font-size: 11px;
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

	.song-info-album {
		font-size: 11px;
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

			.song-info {
				margin-left: 48px;
			}

			.song-actions {
				grid-column: 2;
			}

			.song-duration {
				grid-column: 3;
			}

			.song-album {
				max-width: 150px;
			}
		}

		.song-info {
			flex: 1 1 0;

			.song-info-album {
				max-width: 60%;
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

			.song-album {
				max-width: 120px;
			}
		}

		.song-info {
			flex: 1 1 0;

			.song-info-album {
				max-width: 50%;
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

	.song-info-album {
		font-size: 9px;
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
