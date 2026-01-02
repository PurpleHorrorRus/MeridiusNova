import { usePlaylistStore } from "~/stores/playlist";
import { usePlayerStore } from "~/stores/player";
import { useQueue } from "~/composables/useQueue";

import type { TPlaylist, TAudio, TMore } from "~~/server/utils/types";

type TSongWithFrom = TAudio & {
	from?: string | TPlaylist;
	manual?: boolean;
	clear?: boolean;
};

export const usePlaylist = () => {
	const playlistStore = usePlaylistStore();
	const playerStore = usePlayerStore();
	const { setQueue, playFromQueue } = useQueue();

	const loadPlaylist = async (ownerId: number, playlistId: number, accessHash?: string) => {
		// Для поиска (playlist_id === -1 и owner_id === 0) не загружаем через API
		// Используем текущий плейлист из store
		if (playlistId === -1 && ownerId === 0) {
			const current = playlistStore.current;
			if (current && current.raw_id.startsWith("search_")) {
				return current;
			}
		}

		const playlist = await $fetch<TPlaylist>(`api/vk/playlists/${ownerId}/${playlistId}`, {
			params: {
				list: true,
				access_hash: accessHash
			}
		});

		// Используем универсальный метод для установки очереди
		if (playlist.list && playlist.list.length > 0) {
			setQueue(playlist.list, playlist);
		} else {
			setQueue([], playlist);
		}

		return playlist;
	};

	const updatePlaylist = async (song: TSongWithFrom) => {
		console.log("[UPDATE_PLAYLIST] Called", {
			songId: song.full_id,
			from: song.from,
			manual: song.manual,
			currentQueueLength: playlistStore.playingSongs.length,
			currentPlaylist: playlistStore.current?.raw_id,
			playingPlaylist: playlistStore.playing?.raw_id
		});

		// ПЕРВЫМ ДЕЛОМ проверяем, не находится ли трек уже в очереди воспроизведения
		// Это предотвращает очистку очереди при переключении треков из очереди
		const currentSongs = playlistStore.playingSongs;
		const songIndex = currentSongs.findIndex((s: TAudio) => s.full_id === song.full_id);
		if (songIndex >= 0) {
			console.log("[UPDATE_PLAYLIST] Song already in queue, updating index only", {
				songIndex,
				currentIndex: playlistStore.currentIndex
			});
			// Трек уже в очереди, просто обновляем индекс если нужно
			if (playlistStore.currentIndex !== songIndex) {
				playlistStore.setCurrentIndex(songIndex);
			}
			return false;
		}

		// Если это ручное воспроизведение плейлиста, не обновляем через updatePlaylist
		// так как плейлист уже установлен в playPlaylist или playFromPlaylist
		if (song.manual && song.from && typeof song.from === "object") {
			return false;
		}

		const current = playlistStore.current;
		const playing = playlistStore.playing;

		// Если нет текущего плейлиста или трек из очереди/vkmix, не обновляем
		if (!current) {
			return false;
		}

		const songFrom = song.from;

		// Если трек из VK Mix, не обновляем
		if (songFrom && typeof songFrom === "string") {
			if (/queue|vkmix/.test(songFrom)) {
				return false;
			}
		}

		// Если трек имеет from как объект плейлиста и это VK Mix, не обновляем
		if (songFrom && typeof songFrom === "object") {
			const isVkMix = songFrom.playlist_id === -9 || String(songFrom.owner_id) === "vkmix";
			if (isVkMix) {
				return false;
			}
		}

		// Если трек уже в играющем плейлисте и плейлист совпадает с текущим, не обновляем
		if (playing && current.raw_id === playing.raw_id) {
			return false;
		}

		// Если трек уже в играющем плейлисте и плейлист совпадает с текущим, не обновляем
		if (playing && current.raw_id === playing.raw_id) {
			return false;
		}

		// Если текущий плейлист отличается от играющего, обновляем
		if (current.raw_id !== playing?.raw_id) {
			console.log("[UPDATE_PLAYLIST] Playlists differ, will update", {
				currentRawId: current.raw_id,
				playingRawId: playing?.raw_id,
				songFromType: typeof songFrom,
				songFromValue: songFrom
			});

			// Если трек имеет from как объект плейлиста, используем его
			if (songFrom && typeof songFrom === "object") {
				console.log("[UPDATE_PLAYLIST] Setting queue from playlist object", {
					playlistId: songFrom.raw_id,
					listLength: songFrom.list?.length || 0
				});

				if (songFrom.list && songFrom.list.length > 0) {
					const songIndex = songFrom.list.findIndex((s: TAudio) => s.full_id === song.full_id);
					setQueue(songFrom.list, songFrom, songIndex >= 0 ? songIndex : undefined);
				}

				return true;
			}

			// Для поиска (raw_id начинается с "search_") используем текущий плейлист напрямую
			const isSearchPlaylist = current.raw_id.startsWith("search_");
			if (isSearchPlaylist && current.list && current.list.length > 0) {
				console.log("[UPDATE_PLAYLIST] Setting queue from search playlist", {
					listLength: current.list.length
				});
				const songIndex = current.list.findIndex((s: TAudio) => s.full_id === song.full_id);
				setQueue(current.list, current, songIndex >= 0 ? songIndex : undefined);
				return true;
			}

			// Если трек имеет from как строку (не queue/vkmix), загружаем текущий плейлист
			if (songFrom && typeof songFrom === "string") {
				console.log("[UPDATE_PLAYLIST] Loading playlist from string", {
					from: songFrom,
					currentOwnerId: current.owner_id,
					currentPlaylistId: current.playlist_id
				});
				const currentPlaylist = await loadPlaylist(
					current.owner_id,
					current.playlist_id,
					current.access_hash
				);
				if (currentPlaylist.list && currentPlaylist.list.length > 0) {
					const songIndex = currentPlaylist.list.findIndex((s: TAudio) => s.full_id === song.full_id);
					setQueue(currentPlaylist.list, currentPlaylist, songIndex >= 0 ? songIndex : undefined);
				}
				return true;
			}

			// Если это ручное воспроизведение, НЕ загружаем плейлист
			// так как плейлист уже установлен, и мы не хотим очищать очередь
			if (song.manual) {
				console.log("[UPDATE_PLAYLIST] Skipping manual playback - playlist already set", {
					currentOwnerId: current.owner_id,
					currentPlaylistId: current.playlist_id
				});
				return false;
			}
		}

		return false;
	};

	const playPlaylist = async (playlist: TPlaylist, startIndex = 0) => {
		// ВСЕГДА загружаем плейлист заново, чтобы получить полный список треков
		// даже если в playlist.list уже есть треки, они могут быть неполными
		const currentPlaylist = await loadPlaylist(
			playlist.owner_id,
			playlist.playlist_id,
			playlist.access_hash
		);

		// Если переключаемся на плейлист, который не является VK Mix, очищаем vkMixSectionId
		const isVkMix = currentPlaylist.playlist_id === -9 || String(currentPlaylist.owner_id) === "vkmix";
		if (!isVkMix) {
			playlistStore.setVkMixSectionId(null);
		}

		// Загружаем треки через API для получения more объекта
		const tracksData = await $fetch<{ audios: TAudio[]; more: TMore }>(
			`/api/vk/audio/${currentPlaylist.owner_id}/${currentPlaylist.playlist_id}`,
			{
				params: currentPlaylist.access_hash ? { access_hash: currentPlaylist.access_hash } : {}
			}
		).catch((error) => {
			console.error("Failed to load playlist tracks:", error);
			return null;
		});

		// Устанавливаем текущий плейлист
		playlistStore.setCurrent(currentPlaylist);

		// Устанавливаем плейлист
		playlistStore.setPlaying(currentPlaylist);

		// Сохраняем more объект для автоматической подгрузки
		if (tracksData && tracksData.more && tracksData.more.section_id && tracksData.more.next_from) {
			playlistStore.setPlaylistMore(tracksData.more);
		} else {
			playlistStore.setPlaylistMore(null);
		}

		// Обновляем очередь треков из загруженных треков
		if (tracksData && tracksData.audios && tracksData.audios.length > 0) {
			// Используем универсальный метод для установки очереди
			setQueue(tracksData.audios, currentPlaylist, startIndex);
			const song = tracksData.audios[startIndex];

			if (song) {
				// Добавляем информацию о плейлисте в трек
				await playerStore.play({ ...song, from: currentPlaylist, manual: true } as TSongWithFrom);
			}
		} else if (currentPlaylist.list && currentPlaylist.list.length > 0) {
			// Fallback: используем треки из плейлиста, если API не вернул треки
			setQueue(currentPlaylist.list, currentPlaylist, startIndex);
			const song = currentPlaylist.list[startIndex];

			if (song) {
				// Добавляем информацию о плейлисте в трек
				await playerStore.play({ ...song, from: currentPlaylist, manual: true } as TSongWithFrom);
			}
		} else {
			// Если плейлист пустой, очищаем очередь
			setQueue([], currentPlaylist);
		}
	};

	const playFromPlaylist = async (song: TAudio, playlist: TPlaylist) => {
		console.log(321);

		// Если переключаемся на плейлист, который не является VK Mix, очищаем vkMixSectionId
		const isVkMix = playlist.playlist_id === -9 || String(playlist.owner_id) === "vkmix";

		if (!isVkMix) {
			playlistStore.setVkMixSectionId(null);
		}

		// Загружаем треки через API для получения more объекта
		const tracksData = await $fetch<{ audios: TAudio[]; more: TMore }>(
			`/api/vk/audio/${playlist.owner_id}/${playlist.playlist_id}`,
			{
				params: playlist.access_hash ? { access_hash: playlist.access_hash } : {}
			}
		).catch((error) => {
			console.error("Failed to load playlist tracks:", error);
			return null;
		});

		// Сохраняем more объект для автоматической подгрузки
		if (tracksData && tracksData.more && tracksData.more.section_id && tracksData.more.next_from) {
			playlistStore.setPlaylistMore(tracksData.more);
		} else {
			playlistStore.setPlaylistMore(null);
		}

		// Определяем список треков для очереди
		const queueSongs = (tracksData && tracksData.audios && tracksData.audios.length > 0)
			? tracksData.audios
			: (playlist.list && playlist.list.length > 0)
				? playlist.list
				: [];

		// Используем универсальный метод для воспроизведения из очереди
		await playFromQueue(song, queueSongs, playlist);
	};

	const addToQueue = (song: TAudio) => {
		playlistStore.addSong(song);
	};

	const removeFromQueue = (index: number) => {
		playlistStore.removeSong(index);
	};

	const shuffleSongs = () => {
		playlistStore.shuffleSongs();
	};

	return {
		current: computed(() => playlistStore.current),
		playing: computed(() => playlistStore.playing),
		playingSongs: computed(() => playlistStore.playingSongs),
		currentSong: computed(() => playlistStore.currentSong),
		currentIndex: computed(() => playlistStore.currentIndex),
		shuffle: computed(() => playlistStore.shuffle),
		repeat: computed(() => playlistStore.repeat),
		hasNext: computed(() => playlistStore.hasNext),
		hasPrevious: computed(() => playlistStore.hasPrevious),
		loadPlaylist,
		playPlaylist,
		playFromPlaylist,
		updatePlaylist,
		addToQueue,
		removeFromQueue,
		shuffleSongs,
		toggleShuffle: () => playlistStore.toggleShuffle(),
		toggleRepeat: () => playlistStore.toggleRepeat(),
		setCurrent: (playlist: TPlaylist) => playlistStore.setCurrent(playlist),
		setCurrentIndex: (index: number) => playlistStore.setCurrentIndex(index),
		clear: () => playlistStore.clear()
	};
};