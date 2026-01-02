import { computed } from "vue";
import { storeToRefs } from "pinia";

import { usePlaylistStore } from "~/stores/playlist";
import { usePlayerStore } from "~/stores/player";

import type { TAudio } from "~~/server/api/vk/audio/types";
import type { TPlaylist, TVkMixResponse } from "~~/server/utils/types";

export const useAudio = () => {
	const playerStore = usePlayerStore();
	const playlistStore = usePlaylistStore();
	const { paused, currentTime, duration, volume, muted, playbackRate, progress } = storeToRefs(playerStore);
	const song = computed(() => playerStore.song);
	const playerIsPlaying = computed(() => playerStore.isPlaying);

	const play = async (song: TAudio) => {
		const result = await playerStore.play(song);
		if (!result) {
			// Выводим ошибку только если трек не имеет ограничений и не загружается
			// (т.е. это реальная ошибка, а не ожидаемое поведение)
			if (!song.is_restriction && !song.url) {
				console.warn("Failed to play song - no URL available:", song.title || song.full_id);
			}
		}
		return result;
	};

	const playFromPlaylist = async (song: TAudio, playlist: TPlaylist) => {
		// Устанавливаем очередь треков из плейлиста
		const songs = playlist.list || [];
		playlistStore.setSongs(songs);
		
		playlistStore.setCurrent(playlist);
		playlistStore.setPlaying(playlist);
		
		// Находим индекс трека в отфильтрованной очереди
		const filteredSongs = playlistStore.playingSongs;
		const songIndex = filteredSongs.findIndex((s: TAudio) => s.full_id === song.full_id);
		const index = songIndex >= 0 ? songIndex : 0;

		playlistStore.setCurrentIndex(index);

		// Используем трек из очереди, который уже имеет все данные
		const songToPlay = filteredSongs[index] || song;

		// Добавляем информацию о плейлисте в трек
		const songWithFrom = {
			...songToPlay,
			from: playlist
		};

		await play(songWithFrom);
	};

	const playNext = async () => {		
		// Проверяем, является ли текущий плейлист VK Mix
		const isVkMix = playlistStore.playing && (playlistStore.playing.playlist_id === -9 || String(playlistStore.playing.owner_id) === "vkmix");
		
		if (isVkMix) {
			// Загружаем следующий трек по факту
			const result = await $fetch<TVkMixResponse>("/api/vk/explore/vkmix", {
				params: playlistStore.vkMixSectionId ? { sectionId: playlistStore.vkMixSectionId } : {}
			}).catch((error) => {
				console.error("Failed to load next VK Mix track:", error);
				return null;
			});
			
			if (result && result.song) {
				playlistStore.setVkMixSectionId(result.sectionId);
				
				// Если плейлист еще не установлен, устанавливаем его
				if (!playlistStore.playing || (playlistStore.playing.playlist_id !== -9 && String(playlistStore.playing.owner_id) !== "vkmix")) {
					playlistStore.setPlaying({
						owner_id: 0,
						playlist_id: -9,
						raw_id: "vkmix_-9",
						title: "VK Mix",
						cover_url: "",
						description: "",
						size: 0,
						listens: 0,
						last_updated: 0,
						explicit: false,
						followed: false,
						official: false,
						restricted: false,
						access_hash: "",
						follow_hash: "",
						edit_hash: "",
						list: []
					});
				}
				
				// Добавляем трек в очередь
				playlistStore.addSong(result.song);
				
				// Переходим на следующий трек
				playlistStore.next();
				
				// Обновляем плейлист
				if (playlistStore.playing) {
					playlistStore.playing.list = [...playlistStore.playingSongs];
				}
				
				const nextSong = playlistStore.currentSong;
				if (nextSong) {
					await playerStore.play({ ...nextSong, clear: true, manual: true });
				}
			}
		} else if (playlistStore.playingSongs.length > 0) {
			// Сохраняем текущий индекс и трек перед переключением
			const currentIndexBefore = playlistStore.currentIndex;
			const currentSongBefore = playlistStore.currentSong;
			
			// Переключаемся на следующий трек
			playlistStore.next();
			
			const nextSong = playlistStore.currentSong;
			const currentIndexAfter = playlistStore.currentIndex;

			// Проверяем, что индекс изменился
			if (nextSong && currentIndexAfter !== currentIndexBefore && currentIndexAfter >= 0) {
				// Помечаем трек как из очереди, если он не из текущего плейлиста
				const playing = playlistStore.playing;
				const current = playlistStore.current;

				await playerStore.play({ ...{
					...nextSong,
					from: (current && playing && current.raw_id === playing.raw_id) ? playing : "queue"
				}, clear: true, manual: true });
			}
		}
	};

	const playPrevious = async () => {
		// Используем метод prev() из playerStore, который обрабатывает перемотку и переключение
		await playerStore.prev();
	};

	return {
		play,
		playFromPlaylist,
		playNext,
		playPrevious,
		pause: () => playerStore.pause(),
		resume: () => playerStore.resume(),
		toggle: () => playerStore.toggle(),
		seek: (time: number) => playerStore.seek(time),
		setVolume: (volume: number) => playerStore.setVolume(volume),
		setPlaybackRate: (rate: number) => playerStore.setPlaybackRate(rate),
		toggleMute: () => playerStore.toggleMute(),
		stop: () => playerStore.stop(),
		currentSong: song,
		isPlaying: playerIsPlaying,
		paused,
		currentTime,
		duration,
		volume,
		muted,
		playbackRate,
		progress
	};
};

export const useSeek = () => {
	const { seek } = useAudio();
	return { seek };
};

