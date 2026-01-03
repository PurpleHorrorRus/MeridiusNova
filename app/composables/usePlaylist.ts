import { usePlaylistStore } from "~/stores/playlist";
import { usePlayerStore } from "~/stores/player";
import { useQueue } from "~/composables/useQueue";
import { authenticatedFetch } from "~/utils/api";

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

	const loadPlaylist = async (ownerId: number, playlistId: number, accessHash?: string, sourcePlaylist?: TPlaylist) => {
		// Для поиска (playlist_id === -1 и owner_id === 0) не загружаем через API
		// Используем текущий плейлист из store
		if (playlistId === -1 && ownerId === 0) {
			const current = playlistStore.current;
			if (current && current.raw_id.startsWith("search_")) {
				return current;
			}
		}

		// Для библиотеки пользователя (playlist_id === -1) используем исходный плейлист, если он передан
		// так как он уже имеет правильный title (имя и фамилия пользователя)
		if (playlistId === -1 && sourcePlaylist && sourcePlaylist.title) {
			// Если в исходном плейлисте уже есть треки, используем его
			if (sourcePlaylist.list && sourcePlaylist.list.length > 0) {
				return sourcePlaylist;
			}
			// Иначе загружаем через API, но сохраняем title из исходного плейлиста
			const playlist = await authenticatedFetch<TPlaylist>(`/api/vk/playlists/${ownerId}/${playlistId}`, {
				params: {
					list: true,
					...(accessHash ? { access_hash: accessHash } : {})
				}
			});
			
			// Сохраняем title и cover_url из исходного плейлиста
			playlist.title = sourcePlaylist.title;
			playlist.cover_url = sourcePlaylist.cover_url || playlist.cover_url;
			
			// Используем универсальный метод для установки очереди
			if (playlist.list && playlist.list.length > 0) {
				setQueue(playlist.list, playlist);
			} else {
				setQueue([], playlist);
			}
			
			return playlist;
		}

		const playlist = await authenticatedFetch<TPlaylist>(`/api/vk/playlists/${ownerId}/${playlistId}`, {
			params: {
				list: true,
				...(accessHash ? { access_hash: accessHash } : {})
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

		// ПЕРВЫМ ДЕЛОМ проверяем, не находится ли трек уже в очереди воспроизведения
		// Это предотвращает очистку очереди при переключении треков из очереди
		const currentSongs = playlistStore.playingSongs;
		const songIndex = currentSongs.findIndex((s: TAudio) => s.full_id === song.full_id);
		if (songIndex >= 0) {
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
			// Если трек имеет from как объект плейлиста, используем его
			if (songFrom && typeof songFrom === "object") {

				if (songFrom.list && songFrom.list.length > 0) {
					const songIndex = songFrom.list.findIndex((s: TAudio) => s.full_id === song.full_id);
					setQueue(songFrom.list, songFrom, songIndex >= 0 ? songIndex : undefined);
				}

				return true;
			}

			// Для поиска (raw_id начинается с "search_") используем текущий плейлист напрямую
			const isSearchPlaylist = current.raw_id.startsWith("search_");
			if (isSearchPlaylist && current.list && current.list.length > 0) {
				const songIndex = current.list.findIndex((s: TAudio) => s.full_id === song.full_id);
				setQueue(current.list, current, songIndex >= 0 ? songIndex : undefined);
				return true;
			}

			// Если трек имеет from как строку (не queue/vkmix), загружаем текущий плейлист
			if (songFrom && typeof songFrom === "string") {
				// Для библиотеки пользователя (playlist_id === -1) используем треки из current.list, если они есть
				// но только если owner_id совпадает с owner_id трека, чтобы не использовать треки другого пользователя
				if (current.playlist_id === -1 && current.list && current.list.length > 0) {
					// Проверяем, что owner_id плейлиста совпадает с owner_id трека
					if (current.owner_id === song.owner_id) {
						const songIndex = current.list.findIndex((s: TAudio) => s.full_id === song.full_id);
						setQueue(current.list, current, songIndex >= 0 ? songIndex : undefined);
						return true;
					}
					// Если owner_id не совпадает, не используем треки из current.list
				}
				
				const currentPlaylist = await loadPlaylist(
					current.owner_id,
					current.playlist_id,
					current.access_hash
				);
				
				// Для библиотеки пользователя (playlist_id === -1) сохраняем title из current плейлиста
				// так как API может не вернуть правильное имя пользователя
				if (currentPlaylist.playlist_id === -1 && current.title && current.title !== currentPlaylist.title) {
					currentPlaylist.title = current.title;
					currentPlaylist.cover_url = current.cover_url || currentPlaylist.cover_url;
				}
				
				if (currentPlaylist.list && currentPlaylist.list.length > 0) {
					const songIndex = currentPlaylist.list.findIndex((s: TAudio) => s.full_id === song.full_id);
					setQueue(currentPlaylist.list, currentPlaylist, songIndex >= 0 ? songIndex : undefined);
				}
				return true;
			}

		// Если это ручное воспроизведение, НЕ загружаем плейлист
		// так как плейлист уже установлен, и мы не хотим очищать очередь
		if (song.manual) {
			return false;
		}
		}

		return false;
	};

	const playPlaylist = async (playlist: TPlaylist, startIndex = 0) => {
		console.log("[PLAY_PLAYLIST] START", {
			playlistId: playlist.raw_id,
			ownerId: playlist.owner_id,
			playlistIdNum: playlist.playlist_id,
			startIndex,
			currentPlayingId: playlistStore.playing?.raw_id,
			currentIndex: playlistStore.currentIndex,
			currentQueueLength: playlistStore.playingSongs.length,
			stackTrace: new Error().stack
		});
		
		// Проверяем, не переключаемся ли мы на тот же плейлист
		const currentPlaying = playlistStore.playing;
		const isSamePlaylist = currentPlaying && 
			currentPlaying.owner_id === playlist.owner_id && 
			currentPlaying.playlist_id === playlist.playlist_id &&
			(currentPlaying.raw_id === playlist.raw_id || 
			 (!playlist.raw_id && `${currentPlaying.owner_id}_${currentPlaying.playlist_id}` === `${playlist.owner_id}_${playlist.playlist_id}`));
		
		// Если плейлист уже играет и треки загружены, просто переключаемся на нужный трек
		if (isSamePlaylist && currentPlaying.list && currentPlaying.list.length > 0) {
			const validIndex = startIndex < currentPlaying.list.length ? startIndex : 0;
			const targetSong = currentPlaying.list[validIndex];
			
			if (targetSong) {
				const filteredSongs = playlistStore.playingSongs;
				const foundIndex = filteredSongs.findIndex(s => s.full_id === targetSong.full_id);
				const actualIndex = foundIndex >= 0 ? foundIndex : validIndex;
				
				playlistStore.setCurrentIndex(actualIndex);
				
				const song = filteredSongs[actualIndex] || targetSong;
				if (song && (!playerStore.song || playerStore.song.full_id !== song.full_id)) {
					await playerStore.play({ ...song, from: currentPlaying, manual: true } as TSongWithFrom);
				}
			}
			return;
		}

		// Для библиотеки пользователя (playlist_id === -1) используем переданный плейлист напрямую
		// так как он уже имеет правильный title (имя и фамилия пользователя)
		// и не нужно загружать его через API
		let currentPlaylist: TPlaylist;
		if (playlist.playlist_id === -1 && playlist.title) {
			currentPlaylist = playlist;
		} else {
			// ВСЕГДА загружаем плейлист заново, чтобы получить полный список треков
			// даже если в playlist.list уже есть треки, они могут быть неполными
			currentPlaylist = await loadPlaylist(
				playlist.owner_id,
				playlist.playlist_id,
				playlist.access_hash,
				playlist
			);
		}

		// Если переключаемся на плейлист, который не является VK Mix, очищаем vkMixSectionId
		const isVkMix = currentPlaylist.playlist_id === -9 || String(currentPlaylist.owner_id) === "vkmix";
		if (!isVkMix) {
			playlistStore.setVkMixSectionId(null);
		}

		// Сохраняем title и cover_url из переданного плейлиста, если они есть
		if (playlist.title && playlist.title !== currentPlaylist.title) {
			currentPlaylist.title = playlist.title;
		}
		if (playlist.cover_url && playlist.cover_url !== currentPlaylist.cover_url) {
			currentPlaylist.cover_url = playlist.cover_url;
		}

		// Устанавливаем текущий плейлист
		await playlistStore.setCurrent(currentPlaylist);
		// Устанавливаем плейлист
		await playlistStore.setPlaying(currentPlaylist);

		// Используем треки из currentPlaylist.list, которые уже загружены через loadPlaylist
		// Треки приходят без URL (withUrls: false), URL будет загружаться в момент проигрывания
		if (currentPlaylist.list && currentPlaylist.list.length > 0) {
			const validIndex = startIndex < currentPlaylist.list.length ? startIndex : 0;
			console.log("[PLAY_PLAYLIST] Before setQueue", {
				validIndex,
				listLength: currentPlaylist.list.length,
				currentIndex: playlistStore.currentIndex,
				currentQueueLength: playlistStore.playingSongs.length
			});
			
			await setQueue(currentPlaylist.list, currentPlaylist, validIndex);
			
			console.log("[PLAY_PLAYLIST] After setQueue", {
				currentIndex: playlistStore.currentIndex,
				queueLength: playlistStore.playingSongs.length,
				playingPlaylistId: playlistStore.playing?.raw_id
			});
			
			// Берем трек из отфильтрованной очереди по индексу, который был установлен в setQueue
			// НЕ используем playlistStore.currentIndex, так как он может быть из предыдущего плейлиста
			const filteredSongs = playlistStore.playingSongs;
			
			// Находим трек по индексу в исходном списке и ищем его в отфильтрованной очереди
			const targetSong = currentPlaylist.list[validIndex];
			let actualIndex = 0;
			
			if (targetSong) {
				const foundIndex = filteredSongs.findIndex(s => s.full_id === targetSong.full_id);
				console.log("[PLAY_PLAYLIST] Finding song", {
					targetSongId: targetSong.full_id,
					foundIndex,
					filteredSongsLength: filteredSongs.length
				});
				
				if (foundIndex >= 0) {
					actualIndex = foundIndex;
				} else if (filteredSongs.length > 0) {
					// Если трек не найден (возможно, был отфильтрован), используем первый доступный
					actualIndex = 0;
				}
			}
			
			console.log("[PLAY_PLAYLIST] Before setCurrentIndex", {
				actualIndex,
				currentIndex: playlistStore.currentIndex,
				queueLength: filteredSongs.length
			});
			
			// Убеждаемся, что индекс установлен правильно
			playlistStore.setCurrentIndex(actualIndex);
			
			console.log("[PLAY_PLAYLIST] After setCurrentIndex", {
				currentIndex: playlistStore.currentIndex,
				queueLength: filteredSongs.length
			});
			
			const song = filteredSongs[actualIndex];
			
			console.log("[PLAY_PLAYLIST] About to play", {
				songId: song?.full_id,
				songTitle: song?.title,
				actualIndex,
				currentIndex: playlistStore.currentIndex,
				queueLength: filteredSongs.length,
				playlistId: currentPlaylist.raw_id
			});
			
			if (song) {
				// Добавляем информацию о плейлисте в трек
				await playerStore.play({ ...song, from: currentPlaylist, manual: true } as TSongWithFrom);
				console.log("[PLAY_PLAYLIST] Play called", {
					songId: song.full_id,
					currentIndex: playlistStore.currentIndex
				});
			} else {
				console.error("[PLAY_PLAYLIST] No song found!", {
					actualIndex,
					queueLength: filteredSongs.length,
					currentIndex: playlistStore.currentIndex
				});
			}
		} else {
			// Если плейлист пустой, очищаем очередь
			await setQueue([], currentPlaylist);
		}
		
		console.log("[PLAY_PLAYLIST] END", {
			currentIndex: playlistStore.currentIndex,
			queueLength: playlistStore.playingSongs.length,
			playingPlaylistId: playlistStore.playing?.raw_id,
			currentSongId: playlistStore.currentSong?.full_id
		});
	};

	const playFromPlaylist = async (song: TAudio, playlist: TPlaylist) => {
		// ПЕРВЫМ ДЕЛОМ проверяем, не находится ли трек уже в очереди воспроизведения
		// Это предотвращает очистку очереди при переключении треков из очереди
		const currentSongs = playlistStore.playingSongs;
		const songIndex = currentSongs.findIndex((s: TAudio) => s.full_id === song.full_id);
		if (songIndex >= 0) {
			// Трек уже в очереди, просто обновляем индекс если нужно
			if (playlistStore.currentIndex !== songIndex) {
				playlistStore.setCurrentIndex(songIndex);
			}
			// Используем трек из очереди, который уже имеет все данные (включая URL)
			const songFromQueue = currentSongs[songIndex];
			if (songFromQueue) {
				await playerStore.play({
					...songFromQueue,
					from: playlistStore.playing || playlist,
					manual: true
				} as TSongWithFrom);
			}
			return;
		}

		// Если переключаемся на плейлист, который не является VK Mix, очищаем vkMixSectionId
		const isVkMix = playlist.playlist_id === -9 || String(playlist.owner_id) === "vkmix";

		if (!isVkMix) {
			playlistStore.setVkMixSectionId(null);
		}

		// Для библиотеки пользователя (playlist_id === -1) используем переданный плейлист напрямую
		// так как он уже имеет правильный title (имя и фамилия пользователя)
		if (playlist.playlist_id === -1 && playlist.title) {
			// Устанавливаем плейлист в store, чтобы title отображался правильно
			await playlistStore.setCurrent(playlist);
			await playlistStore.setPlaying(playlist);
			
			// Если треки уже есть, используем их, но только если owner_id совпадает
			// чтобы не использовать треки другого пользователя
			if (playlist.list && playlist.list.length > 0 && playlist.owner_id === song.owner_id) {
				// Проверяем, что все треки в списке имеют правильный owner_id
				const validTracks = playlist.list.filter((t: TAudio) => t.owner_id === song.owner_id);
				if (validTracks.length > 0) {
					// Используем универсальный метод для воспроизведения из очереди
					// Для библиотеки пользователя треки уже загружены на странице, не делаем повторный запрос
					await playFromQueue(song, validTracks, playlist);
					return;
				}
			}
			
			// Если треков нет или owner_id не совпадает, загружаем их через API
			// но не перезаписываем title плейлиста
		}

		// Для обычных плейлистов или если треков нет, загружаем через API
		// Но для библиотеки пользователя проверяем, может быть треки уже есть в current плейлисте
		let tracksData: { audios: TAudio[]; more: TMore | null } | null = null;
		
		// Проверяем, есть ли треки в переданном плейлисте
		if (playlist.list && playlist.list.length > 0) {
			// Используем треки из переданного плейлиста, которые уже загружены
			tracksData = {
				audios: playlist.list,
				more: playlist.more || null
			};
		}
		// Для библиотеки пользователя проверяем, есть ли треки в current плейлисте
		else if (playlist.playlist_id === -1) {
			const currentPlaylist = playlistStore.current;
			if (currentPlaylist && 
				currentPlaylist.playlist_id === -1 && 
				currentPlaylist.owner_id === playlist.owner_id &&
				currentPlaylist.list && 
				currentPlaylist.list.length > 0) {
				// Используем треки из current плейлиста, которые уже загружены
				tracksData = {
					audios: currentPlaylist.list,
					more: playlistStore.playlistMore
				};
			}
		}
		// Для обычных плейлистов проверяем, есть ли треки в current плейлисте
		else {
			const currentPlaylist = playlistStore.current;
			if (currentPlaylist && 
				currentPlaylist.owner_id === playlist.owner_id &&
				currentPlaylist.playlist_id === playlist.playlist_id &&
				currentPlaylist.list && 
				currentPlaylist.list.length > 0) {
				// Используем треки из current плейлиста, которые уже загружены
				tracksData = {
					audios: currentPlaylist.list,
					more: playlistStore.playlistMore
				};
			}
		}
		
		// Если треки не найдены, загружаем через API
		if (!tracksData) {
			tracksData = await authenticatedFetch<{ audios: TAudio[]; more: TMore }>(
				`/api/vk/audio/${playlist.owner_id}/${playlist.playlist_id}`,
				{
					params: playlist.access_hash ? { access_hash: playlist.access_hash } : {}
				}
			).catch((error) => {
				console.error("Failed to load playlist tracks:", error);
				return null;
			});
		}

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

		// Обновляем плейлист с актуальными данными перед установкой очереди
		const updatedPlaylist = {
			...playlist,
			list: queueSongs
		};

		// Для библиотеки пользователя (playlist_id === -1) сохраняем title из переданного плейлиста
		// так как API может не вернуть правильное имя пользователя
		if (updatedPlaylist.playlist_id === -1 && playlist.title) {
			updatedPlaylist.title = playlist.title;
			updatedPlaylist.cover_url = playlist.cover_url || updatedPlaylist.cover_url;
		}

		// Устанавливаем плейлист в store, чтобы title отображался правильно
		await playlistStore.setCurrent(updatedPlaylist);
		await playlistStore.setPlaying(updatedPlaylist);

		// Используем универсальный метод для воспроизведения из очереди
		await playFromQueue(song, queueSongs, updatedPlaylist);
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
		setCurrent: async (playlist: TPlaylist) => await playlistStore.setCurrent(playlist),
		setCurrentIndex: (index: number) => playlistStore.setCurrentIndex(index),
		clear: () => playlistStore.clear()
	};
};