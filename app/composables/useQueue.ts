import { usePlaylistStore } from "~/stores/playlist";
import { usePlayerStore } from "~/stores/player";

import type { TAudio } from "~~/server/api/vk/audio/types";
import type { TPlaylist } from "~~/server/utils/types";

type TSongWithFrom = TAudio & {
	from?: string | TPlaylist;
	manual?: boolean;
};

/**
 * Универсальный composable для управления очередью воспроизведения
 * Поддерживает установку очереди из любых источников (плейлисты, поиск, библиотеки и т.д.)
 */
export const useQueue = () => {
	const playlistStore = usePlaylistStore();
	const playerStore = usePlayerStore();

	/**
	 * Устанавливает очередь воспроизведения из массива треков
	 * Автоматически фильтрует restricted треки
	 * 
	 * @param songs - Массив треков для установки в очередь
	 * @param playlist - Опциональный плейлист для установки как current/playing
	 * @param startIndex - Опциональный индекс для установки текущего трека
	 */
	const setQueue = async (songs: TAudio[], playlist?: TPlaylist, startIndex?: number) => {
		console.log("[SET_QUEUE] Called", {
			songsCount: songs.length,
			playlistId: playlist?.raw_id,
			startIndex,
			currentQueueLength: playlistStore.playingSongs.length,
			currentPlaylist: playlistStore.current?.raw_id,
			playingPlaylist: playlistStore.playing?.raw_id,
			stackTrace: new Error().stack
		});

		// Устанавливаем плейлист, если передан
		// ВАЖНО: устанавливаем плейлист ДО setSongs, чтобы playing был обновлен
		if (playlist) {
			// setSongs автоматически фильтрует restricted треки, поэтому используем оригинальный список
			// для плейлиста, а фильтрация произойдет в setSongs
			// Обновляем плейлист с актуальным списком треков
			const updatedPlaylist = { ...playlist, list: songs };
			await playlistStore.setCurrent(updatedPlaylist);
			await playlistStore.setPlaying(updatedPlaylist);
		}

		// Устанавливаем очередь треков (setSongs автоматически фильтрует restricted треки)
		playlistStore.setSongs(songs);

		console.log("[SET_QUEUE] After setSongs", {
			newQueueLength: playlistStore.playingSongs.length,
			currentPlaylist: playlistStore.current?.raw_id,
			playingPlaylist: playlistStore.playing?.raw_id
		});

		// Устанавливаем индекс, если передан
		// Используем playingSongs для получения правильного индекса после фильтрации
		if (startIndex !== undefined && startIndex >= 0 && startIndex < songs.length) {
			// Находим трек по индексу в исходном списке
			const targetSong = songs[startIndex];
			console.log("[SET_QUEUE] Setting index", {
				startIndex,
				targetSongId: targetSong?.full_id,
				queueLength: playlistStore.playingSongs.length,
				currentIndex: playlistStore.currentIndex
			});
			
			if (targetSong) {
				// Ищем этот трек в отфильтрованной очереди
				const filteredIndex = playlistStore.playingSongs.findIndex(s => s.full_id === targetSong.full_id);
				console.log("[SET_QUEUE] Found index in queue", {
					filteredIndex,
					targetSongId: targetSong.full_id
				});
				
				if (filteredIndex >= 0) {
					playlistStore.setCurrentIndex(filteredIndex);
					console.log("[SET_QUEUE] Index set to", filteredIndex);
				} else {
					// Если трек не найден (возможно, был отфильтрован), используем первый доступный
					console.log("[SET_QUEUE] Song not found in queue, setting to 0");
					playlistStore.setCurrentIndex(0);
				}
			} else {
				console.log("[SET_QUEUE] No target song, setting to 0");
				playlistStore.setCurrentIndex(0);
			}
		}
		
		console.log("[SET_QUEUE] Final state", {
			currentIndex: playlistStore.currentIndex,
			queueLength: playlistStore.playingSongs.length,
			playingPlaylistId: playlistStore.playing?.raw_id
		});
	};

	/**
	 * Воспроизводит трек из очереди
	 * Автоматически определяет, нужно ли обновлять очередь или просто переключить индекс
	 * 
	 * @param song - Трек для воспроизведения
	 * @param songs - Массив треков для установки в очередь (если очередь нужно обновить)
	 * @param playlist - Опциональный плейлист для установки как current/playing
	 * @param forceUpdate - Принудительно обновить очередь, даже если трек уже в очереди
	 */
	const playFromQueue = async (
		song: TAudio,
		songs: TAudio[],
		playlist?: TPlaylist,
		forceUpdate = false
	) => {
		// Проверяем, не является ли трек уже частью играющего плейлиста
		const isSamePlaylist = playlist && playlistStore.playing && playlistStore.playing.raw_id === playlist.raw_id;
		const currentSongs = playlistStore.playingSongs;
		const existingIndex = currentSongs.findIndex((s: TAudio) => s.full_id === song.full_id);

		// Если трек уже в играющем плейлисте и не требуется принудительное обновление,
		// просто обновляем индекс и воспроизводим
		if (isSamePlaylist && existingIndex >= 0 && !forceUpdate) {
			if (playlist) {
				await playlistStore.setCurrent({ ...playlist, list: songs });
			}

			playlistStore.setCurrentIndex(existingIndex);

			// Используем трек из очереди, который уже имеет все данные (включая URL)
			const songFromQueue = currentSongs[existingIndex];

			if (songFromQueue) {				
				await playerStore.play({
					...songFromQueue,
					from: playlist,
					manual: true
				} as TSongWithFrom);
			}

			return;
		}

		// Находим индекс трека в исходном списке для передачи в setQueue
		const songIndexInSource = songs.findIndex(songItem => songItem.full_id === song.full_id);
		const startIndex = songIndexInSource >= 0 ? songIndexInSource : 0;

		// Устанавливаем очередь (setQueue автоматически фильтрует restricted треки)
		// ВАЖНО: устанавливаем плейлист ДО вызова play, чтобы updatePlaylist не перезагружал плейлист
		// Передаем startIndex, чтобы setQueue правильно установил индекс после фильтрации
		await setQueue(songs, playlist, startIndex);

		// После setQueue индекс уже должен быть установлен правильно
		// Но на всякий случай проверяем и используем трек из очереди
		const filteredSongs = playlistStore.playingSongs;
		const actualIndex = playlistStore.currentIndex >= 0 && playlistStore.currentIndex < filteredSongs.length
			? playlistStore.currentIndex
			: 0;
		
		// Используем трек из очереди, который уже имеет все данные (включая URL)
		// Если трек не найден в отфильтрованной очереди, используем исходный
		const songToPlay = filteredSongs[actualIndex] || song;

		// Добавляем информацию о плейлисте в трек и помечаем как manual
		// manual: true гарантирует, что updatePlaylist не будет вызван в playerStore.play
		await playerStore.play({ ...songToPlay, from: playlist, manual: true } as TSongWithFrom);
	};

	/**
	 * Добавляет треки в конец очереди
	 * Автоматически фильтрует restricted треки
	 * 
	 * @param songs - Массив треков для добавления
	 */
	const appendToQueue = (songs: TAudio[]) => {
		const filteredSongs = songs.filter(songItem => !songItem.is_restriction);
		filteredSongs.forEach(song => {
			playlistStore.addSong(song);
		});

		// Обновляем список треков в плейлисте для синхронизации
		if (playlistStore.playing) {
			playlistStore.playing.list = [...playlistStore.playingSongs];
		}
	};

	return {
		setQueue,
		playFromQueue,
		appendToQueue
	};
};

