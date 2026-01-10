import { triggerRef } from "vue";
import type { Ref, ComputedRef } from "vue";
import * as lodash from "lodash";

import { usePlayerStore } from "./player";
import { useVkStore } from "./vk";
import { useAudioStore } from "./audio";
import { useSearchStore } from "./search";
import { useDownloadsStore } from "~/stores/downloads";

import { authenticatedFetch } from "~/utils/api";
import { createAudioBody } from "~/utils/audio-api";
import { getUserFullName } from "~/utils/user";
import { isTauri } from "~/utils/tauri";
import { isSearchPage, isUserLibraryPage } from "~/utils/route";

import type { TAudio } from "~~/server/api/vk/audio/types";
import type { TPlaylist, TMore } from "~~/server/utils/types";
import type { TParsedPayload } from "~~/server/api/vk/audio/types";

type TSongWithFrom = TAudio & {
	from?: string | TPlaylist;
	manual?: boolean;
	clear?: boolean;
};

export const usePlaylistStore = defineStore("playlist", {
	state: () => ({
		current: null as TPlaylist | null,
		playing: null as TPlaylist | null,
		loaded: [] as TAudio[],
		playingSongs: [] as TAudio[],
		originalSongsOrder: [] as string[],
		currentIndex: -1,
		shuffle: false,
		repeat: false,
		vkMixSectionId: null as string | null,
		playlistMore: null as TMore | null,
		userPlaylists: [] as TPlaylist[],
		userPlaylistsOwnerId: null as number | null
	}),

	getters: {
		currentSong: (state) => {
			if (state.currentIndex >= 0 && state.currentIndex < state.playingSongs.length) {
				return state.playingSongs[state.currentIndex];
			}

			return null;
		},

		hasNext: (state) => {
			// Для VK Mix всегда есть следующий трек (бесконечная очередь)
			if (state.playing && (state.playing.playlist_id === -9 || String(state.playing.owner_id) === "vkmix")) {
				return true;
			}

			// Если включен repeat, всегда есть следующий трек (даже если это первый)
			if (state.repeat) {
				return state.playingSongs.length > 0;
			}

			// Если индекс не установлен, но есть треки в плейлисте, есть следующий
			if (state.currentIndex < 0 && state.playingSongs.length > 0) {
				return true;
			}

			// Проверяем, есть ли доступные (не-restricted) треки после текущего
			if (state.currentIndex >= 0 && state.currentIndex < state.playingSongs.length - 1) {
				// Проверяем, есть ли хотя бы один не-restricted трек после текущего
				for (let i = state.currentIndex + 1; i < state.playingSongs.length; i++) {
					if (!state.playingSongs[i]?.is_restriction) {
						return true;
					}
				}
			}

			return false;
		},

		hasPrevious: (state) => {
			// Если включен repeat, всегда есть предыдущий трек (даже если это последний)
			if (state.repeat) {
				return state.playingSongs.length > 0;
			}

			// Если индекс не установлен или равен 0, нет предыдущего
			if (state.currentIndex <= 0) {
				return false;
			}

			// Проверяем, есть ли доступные (не-restricted) треки до текущего
			if (state.currentIndex > 0) {
				// Проверяем, есть ли хотя бы один не-restricted трек до текущего
				for (let i = state.currentIndex - 1; i >= 0; i--) {
					if (!state.playingSongs[i]?.is_restriction) {
						return true;
					}
				}
			}

			return false;
		},

		currentPlaylist: (state) => {
			if (state.playing) {
				return state.playing;
			}

			if (state.current && state.playingSongs.length > 0) {
				return state.current;
			}

			return null;
		},

		playlistSource: (state) => {
			const playlist = state.playing || (state.current && state.playingSongs.length > 0 ? state.current : null);

			if (!playlist) {
				return { title: "", description: "", canNavigate: false, link: undefined };
			}

			return {
				title: playlist.title || "",
				description: playlist.description || "",
				canNavigate: !!playlist.link,
				link: playlist.link
			};
		}
	},

	actions: {
		async setCurrent(playlist: TPlaylist) {
			// Нормализуем плейлист (устанавливаем правильные title, description, cover_url)
			const normalizedPlaylist = await this.normalizePlaylist(playlist);

			// Определяем link из текущего route, если он соответствует плейлисту
			if (!normalizedPlaylist.link) {
				try {
					const route = useRoute();

					// Для поиска
					if (normalizedPlaylist.raw_id.startsWith("search_")) {
						const searchQuery = normalizedPlaylist.raw_id.replace("search_", "");
						if (route.path === "/search" && route.query.q === searchQuery) {
							normalizedPlaylist.link = `${route.path}?q=${encodeURIComponent(searchQuery)}`;
						} else {
							normalizedPlaylist.link = `/search?q=${encodeURIComponent(searchQuery)}`;
						}
					}
					// Для обычных плейлистов
					else if (normalizedPlaylist.owner_id !== 0 && normalizedPlaylist.playlist_id !== 0) {
						const routeOwnerId = Number(route.params.owner_id);
						const routePlaylistId = Number(route.params.playlist_id);

						if (routeOwnerId === normalizedPlaylist.owner_id && routePlaylistId === normalizedPlaylist.playlist_id) {
							// Используем текущий route
							const queryString = route.query.access_hash
								? `?access_hash=${route.query.access_hash}`
								: (normalizedPlaylist.access_hash ? `?access_hash=${normalizedPlaylist.access_hash}` : "");
							normalizedPlaylist.link = `${route.path}${queryString}`;
						} else {
							// Генерируем link
							const queryString = normalizedPlaylist.access_hash ? `?access_hash=${normalizedPlaylist.access_hash}` : "";
							normalizedPlaylist.link = `/playlist/${normalizedPlaylist.owner_id}/${normalizedPlaylist.playlist_id}${queryString}`;
						}
					}
				} catch {
					// Если не удалось получить route, генерируем link
					if (normalizedPlaylist.raw_id.startsWith("search_")) {
						const searchQuery = normalizedPlaylist.raw_id.replace("search_", "");
						normalizedPlaylist.link = `/search?q=${encodeURIComponent(searchQuery)}`;
					} else if (normalizedPlaylist.owner_id !== 0 && normalizedPlaylist.playlist_id !== 0) {
						const queryString = normalizedPlaylist.access_hash ? `?access_hash=${normalizedPlaylist.access_hash}` : "";
						normalizedPlaylist.link = `/playlist/${normalizedPlaylist.owner_id}/${normalizedPlaylist.playlist_id}${queryString}`;
					}
				}
			}

			// Проверяем, действительно ли плейлист изменился, чтобы избежать повторных обновлений
			const isSamePlaylist = this.current &&
				this.current.raw_id === normalizedPlaylist.raw_id &&
				this.current.owner_id === normalizedPlaylist.owner_id &&
				this.current.playlist_id === normalizedPlaylist.playlist_id;

			if (isSamePlaylist && this.current) {
				// Обновляем только list, если он изменился, но сохраняем нормализованные поля
				if (normalizedPlaylist.list && normalizedPlaylist.list.length !== (this.current.list?.length || 0)) {
					this.current.list = normalizedPlaylist.list || [];
					this.loaded = normalizedPlaylist.list || [];
				}
				// Обновляем нормализованные поля даже для того же плейлиста
				this.current.title = normalizedPlaylist.title;
				this.current.description = normalizedPlaylist.description;
				this.current.link = normalizedPlaylist.link;
				// Обновляем cover_url, если он был установлен при нормализации
				if (normalizedPlaylist.cover_url && (!this.current.cover_url || this.current.cover_url.trim() === "")) {
					this.current.cover_url = normalizedPlaylist.cover_url;
				}
				return;
			}

			// При смене плейлиста явно очищаем старые данные для освобождения памяти
			this.loaded = [];
			if (this.current?.list) {
				this.current.list = [];
			}

			// Устанавливаем новый плейлист
			// Используем новый массив для list, чтобы не удерживать ссылки на старые данные
			this.current = {
				...normalizedPlaylist,
				list: normalizedPlaylist.list ? [...normalizedPlaylist.list] : []
			};
			this.loaded = this.current.list || [];
		},

		async setPlaying(playlist: TPlaylist) {
			// Проверяем, меняется ли плейлист
			const isSamePlaylist = this.playing &&
				this.playing.raw_id === playlist.raw_id &&
				this.playing.owner_id === playlist.owner_id &&
				this.playing.playlist_id === playlist.playlist_id;

			// Если плейлист меняется, очищаем старые данные для освобождения памяти
			if (!isSamePlaylist) {
				this.originalSongsOrder = [];
				if (this.playing?.list) {
					this.playing.list = [];
				}
			}

			// Берем свойства из current, если он установлен и это тот же плейлист
			if (this.current &&
				this.current.raw_id === playlist.raw_id &&
				this.current.owner_id === playlist.owner_id &&
				this.current.playlist_id === playlist.playlist_id) {
				// Копируем нормализованные свойства из current
				this.playing = {
					...playlist,
					title: this.current.title,
					description: this.current.description,
					link: this.current.link,
					cover_url: this.current.cover_url,
					list: playlist.list || []
				};
			} else {
				// Если current не установлен или это другой плейлист, нормализуем переданный
				this.playing = await this.normalizePlaylist(playlist);
			}

			// Обновляем список треков в плейлисте из playingSongs, если они уже установлены
			// Это гарантирует синхронизацию, но не перезаписывает очередь
			// Используем прямое присваивание для лучшей производительности и освобождения памяти
			if (this.playingSongs.length > 0) {
				this.playing.list = this.playingSongs;
			} else if (!this.playing.list) {
				this.playing.list = [];
			}
			// playingSongs обновляется через setSongs для гарантии правильного обновления очереди
		},

		setSongs(songs: TAudio[]) {
			// Очищаем оригинальный порядок при установке новой очереди
			this.originalSongsOrder = [];

			// Фильтруем и добавляем поле _index для быстрого доступа
			const filteredSongs = Array.isArray(songs)
				? songs.filter(songItem => !songItem.is_restriction)
				: [];

			// Добавляем поле _index к каждому треку для быстрого доступа без поиска
			for (let i = 0; i < filteredSongs.length; i++) {
				(filteredSongs[i] as TAudio & { _index?: number })._index = i;
			}

			this.playingSongs = filteredSongs;

			// currentIndex сбрасываем только если он выходит за границы нового массива
			if (this.currentIndex >= this.playingSongs.length) {
				this.currentIndex = -1;
			}
		},

		addSong(song: TAudio, index?: number) {
			// Пропускаем restricted треки
			if (song.is_restriction) {
				return;
			}

			if (index !== undefined) {
				this.playingSongs.splice(index, 0, song);
				// Обновляем индексы для всех треков после вставки
				for (let i = index; i < this.playingSongs.length; i++) {
					(this.playingSongs[i] as TAudio & { _index?: number })._index = i;
				}
			} else {
				const newIndex = this.playingSongs.length;
				this.playingSongs.push(song);
				(song as TAudio & { _index?: number })._index = newIndex;
			}
		},

		removeSong(index: number) {
			if (index >= 0 && index < this.playingSongs.length) {
				this.playingSongs.splice(index, 1);

				// Обновляем индексы для всех треков после удаления
				for (let i = index; i < this.playingSongs.length; i++) {
					(this.playingSongs[i] as TAudio & { _index?: number })._index = i;
				}

				if (this.currentIndex >= index) {
					this.currentIndex--;
				}
			}
		},

		removeSongByFullId(fullId: string) {
			// Удаляем из playingSongs
			const playingIndex = this.playingSongs.findIndex(songItem => songItem.full_id === fullId);
			if (playingIndex >= 0) {
				this.playingSongs.splice(playingIndex, 1);

				// Обновляем индексы для всех треков после удаления
				for (let i = playingIndex; i < this.playingSongs.length; i++) {
					(this.playingSongs[i] as TAudio & { _index?: number })._index = i;
				}

				if (this.currentIndex >= playingIndex) {
					this.currentIndex--;
				}

				// Обновляем список в playing плейлисте
				// Используем прямое присваивание для лучшей производительности
				if (this.playing) {
					this.playing.list = this.playingSongs;
				}
			}

			// Удаляем из loaded
			const loadedIndex = this.loaded.findIndex(songItem => songItem.full_id === fullId);
			if (loadedIndex >= 0) {
				this.loaded.splice(loadedIndex, 1);

				// Обновляем список в current плейлисте
				// Используем прямое присваивание для лучшей производительности
				if (this.current) {
					this.current.list = this.loaded;
				}
			}

			// Обновляем originalSongsOrder если shuffle включен
			if (this.originalSongsOrder.length > 0) {
				const originalIndex = this.originalSongsOrder.indexOf(fullId);
				if (originalIndex >= 0) {
					this.originalSongsOrder.splice(originalIndex, 1);
				}
			}
		},

		setCurrentIndex(index: number) {
			if (index >= 0 && index < this.playingSongs.length) {
				this.currentIndex = index;
			}
		},

		reorderQueue(newOrder: TAudio[], originalOrder?: TAudio[], fromIndex?: number, toIndex?: number) {
			if (!Array.isArray(newOrder) || newOrder.length === 0) {
				return;
			}

			const currentSongFullId = this.currentIndex >= 0 && this.currentIndex < this.playingSongs.length
				? this.playingSongs[this.currentIndex]?.full_id
				: null;

			this.playingSongs = newOrder;

			for (let i = 0; i < this.playingSongs.length; i++) {
				(this.playingSongs[i] as TAudio & { _index?: number })._index = i;
			}

			if (currentSongFullId) {
				const newCurrentIndex = this.playingSongs.findIndex((songItem: TAudio) => songItem.full_id === currentSongFullId);
				if (newCurrentIndex >= 0) {
					this.currentIndex = newCurrentIndex;
				} else if (this.currentIndex >= this.playingSongs.length) {
					this.currentIndex = -1;
				}
			} else if (this.currentIndex >= this.playingSongs.length) {
				this.currentIndex = -1;
			}

			if (this.playing) {
				this.playing.list = this.playingSongs;
			}
		},

		next() {
			const songsLength = this.playingSongs.length;
			if (songsLength === 0) {
				return;
			}

			// Если индекс не установлен, устанавливаем на первый доступный трек
			if (this.currentIndex < 0) {
				for (let i = 0; i < songsLength; i++) {
					if (!this.playingSongs[i]?.is_restriction) {
						this.currentIndex = i;
						return;
					}
				}
				return;
			}

			const currentIndex = this.currentIndex;

			// Подсчитываем доступные индексы напрямую без создания массива
			let availableCount = 0;
			let firstAvailable = -1;
			for (let i = 0; i < songsLength; i++) {
				if (!this.playingSongs[i]?.is_restriction) {
					availableCount++;
					if (firstAvailable < 0) {
						firstAvailable = i;
					}
				}
			}

			if (availableCount === 0) {
				return;
			}

			// Если только один доступный трек и не включен repeat, не переключаемся
			if (availableCount === 1 && !this.repeat) {
				return;
			}

		let newIndex: number;

		if (this.shuffle) {
			// При включенном shuffle очередь уже перемешана, переходим к следующему треку по порядку
			// Ищем следующий доступный трек после текущего
			for (let i = currentIndex + 1; i < songsLength; i++) {
				if (!this.playingSongs[i]?.is_restriction) {
					this.currentIndex = i;
					return;
				}
			}
			// Если дошли до конца и включен repeat, переходим к началу
			if (this.repeat) {
				for (let i = 0; i < currentIndex; i++) {
					if (!this.playingSongs[i]?.is_restriction) {
						this.currentIndex = i;
						return;
					}
				}
				// Если нет доступных треков кроме текущего, остаемся на нем
				this.currentIndex = currentIndex;
			}
			return;
		} else if (this.repeat) {
				// При repeat переходим на следующий доступный трек по кругу
				// Находим текущий индекс в доступных и следующий
				let currentInAvailable = -1;
				const availableIndices: number[] = [];
				for (let i = 0; i < songsLength; i++) {
					if (!this.playingSongs[i]?.is_restriction) {
						if (i === currentIndex) {
							currentInAvailable = availableIndices.length;
						}
						availableIndices.push(i);
					}
				}

				if (currentInAvailable >= 0) {
					newIndex = availableIndices[(currentInAvailable + 1) % availableIndices.length] ?? currentIndex;
				} else {
					newIndex = firstAvailable >= 0 ? firstAvailable : currentIndex;
				}
			} else {
				// Обычный режим: ищем следующий доступный трек после текущего
				for (let i = currentIndex + 1; i < songsLength; i++) {
					if (!this.playingSongs[i]?.is_restriction) {
						this.currentIndex = i;
						return;
					}
				}
				return;
			}

			// Устанавливаем новый индекс
			this.currentIndex = newIndex;
		},

	async previous(): Promise<void> {
		if (this.playingSongs.length === 0) {
			return;
		}

		// Если индекс не установлен, устанавливаем на последний доступный трек
		if (this.currentIndex < 0) {
			for (let i = this.playingSongs.length - 1; i >= 0; i--) {
				if (!this.playingSongs[i]?.is_restriction) {
					this.currentIndex = i;
					return;
				}
			}
			return;
		}

		let newIndex: number;

		if (this.shuffle) {
			// При включенном shuffle очередь уже перемешана, переходим к предыдущему треку по порядку
			if (this.currentIndex > 0) {
				// Ищем предыдущий доступный трек
				for (let i = this.currentIndex - 1; i >= 0; i--) {
					if (!this.playingSongs[i]?.is_restriction) {
						this.currentIndex = i;
						return;
					}
				}
			}
			// Если дошли до начала и включен repeat, переходим к концу
			if (this.repeat) {
				for (let i = this.playingSongs.length - 1; i > this.currentIndex; i--) {
					if (!this.playingSongs[i]?.is_restriction) {
						this.currentIndex = i;
						return;
					}
				}
			}
			return;
		} else if (this.repeat) {
			newIndex = this.currentIndex <= 0
				? this.playingSongs.length - 1
				: this.currentIndex - 1;
		} else if (this.currentIndex > 0) {
				newIndex = this.currentIndex - 1;
			} else {
				return;
			}

			// Пропускаем restricted треки
			let attempts = 0;
			while (attempts < this.playingSongs.length && this.playingSongs[newIndex]?.is_restriction) {
				if (this.repeat) {
					newIndex = newIndex <= 0
						? this.playingSongs.length - 1
						: newIndex - 1;
				} else if (newIndex > 0) {
					newIndex--;
				} else {
					// Если дошли до начала и все restricted, идем к концу
					newIndex = this.playingSongs.length - 1;
				}
				attempts++;
			}

			// Если нашли не-restricted трек, переключаемся на него
			if (!this.playingSongs[newIndex]?.is_restriction) {
				this.currentIndex = newIndex;
			}
		},

		shuffleSongs() {
			if (this.playingSongs.length <= 1) {
				return;
			}

		// Используем lodash shuffle для перемешивания массива
		const shuffled = lodash.shuffle([...this.playingSongs]);

			// Находим индекс текущего трека в перемешанном массиве
			const currentSongIndex = this.currentSong?.full_id ? shuffled.findIndex(songItem => songItem?.full_id === this.currentSong?.full_id) : -1;

			// Ставим текущий трек на первое место
			if (currentSongIndex >= 0 && currentSongIndex !== 0) {
				const temp = shuffled[currentSongIndex];
				if (temp && shuffled[0]) {
					shuffled[currentSongIndex] = shuffled[0];
					shuffled[0] = temp;
				}
			}

			// Обновляем индексы
			for (let i = 0; i < shuffled.length; i++) {
				const song = shuffled[i] as TAudio & { _index?: number };
				if (song) {
					song._index = i;
				}
			}

			this.playingSongs = shuffled;
			// Текущий трек всегда на первом месте после перемешивания, если он был найден
			this.currentIndex = currentSongIndex >= 0 ? 0 : -1;
		},

		async toggleShuffle() {
			if (!this.shuffle) {
				// Включаем shuffle
				// Сохраняем оригинальный порядок full_id, если еще не сохранен
				if (this.originalSongsOrder.length === 0 && this.playingSongs.length > 0) {
					this.originalSongsOrder = new Array(this.playingSongs.length);
					for (let i = 0; i < this.playingSongs.length; i++) {
						this.originalSongsOrder[i] = this.playingSongs[i]?.full_id || "";
					}
				}
				// Перемешиваем треки
				this.shuffleSongs();
			} else {
				// Выключаем shuffle - восстанавливаем оригинальный порядок
				if (this.originalSongsOrder.length > 0) {
					// Создаем Map для быстрого поиска треков по full_id
					const songsMap = new Map<string, TAudio>();

					for (let i = 0; i < this.playingSongs.length; i++) {
						const song = this.playingSongs[i];

						if (song?.full_id) {
							songsMap.set(song.full_id, song);
						}
					}

					// Восстанавливаем порядок используя originalSongsOrder
					// Фильтруем только существующие треки для эффективности
					const restored: TAudio[] = [];
					for (let i = 0; i < this.originalSongsOrder.length; i++) {
						const fullId = this.originalSongsOrder[i];
						if (fullId) {
							const song = songsMap.get(fullId);

							if (song) {
								(song as TAudio & { _index?: number })._index = restored.length;
								restored.push(song);
							}
						}
					}

					this.playingSongs = restored;

					// Обновляем currentIndex чтобы текущий трек остался активным
					if (this.currentSong?.full_id) {
						const restoredIndex = restored.findIndex(songItem => songItem?.full_id === this.currentSong?.full_id);
						if (restoredIndex >= 0) {
							this.currentIndex = restoredIndex;
						}
					}

					this.originalSongsOrder = [];
				}
			}

			this.shuffle = !this.shuffle;

			const { useSettingsStore } = await import("~/stores/settings");
			await useSettingsStore().updateSection("player", { random: this.shuffle });
		},

		async toggleRepeat() {
			this.repeat = !this.repeat;

			const { useSettingsStore } = await import("~/stores/settings");
			await useSettingsStore().updateSection("player", { repeat: this.repeat });
		},

		clear() {
			this.current = null;
			this.playing = null;
			this.loaded = [];
			this.playingSongs = [];
			this.currentIndex = -1;
			this.vkMixSectionId = null;
			this.playlistMore = null;
		},

		clearUserPlaylists() {
			this.userPlaylists = [];
			this.userPlaylistsOwnerId = null;
		},

		setPlaylistMore(more: TMore | null) {
			this.playlistMore = more;
		},

		async loadMoreTracks(): Promise<TAudio[] | null> {
			if (!this.playlistMore || !this.playing || !this.playlistMore.section_id || !this.playlistMore.next_from) {
				return null;
			}

			const result = await $fetch<{ audios: TAudio[]; more: TMore }>(
				`/api/vk/audio/${this.playing.owner_id}/${this.playing.playlist_id}`,
				{
					params: {
						section_id: this.playlistMore.section_id,
						next_from: this.playlistMore.next_from
					}
				}
			).catch((error) => {
				console.error("Failed to load more tracks:", error);
				return null;
			});

			if (!result?.audios) {
				return null;
			}

			// Фильтруем и добавляем restricted треки напрямую без промежуточной переменной
			for (let i = 0; i < result.audios.length; i++) {
				const audio = result.audios[i];
				if (audio && !audio.is_restriction) {
					const newIndex = this.playingSongs.length;
					this.playingSongs.push(audio);
					(audio as TAudio & { _index?: number })._index = newIndex;
				}
			}

			if (this.playing) {
				this.playing.list = this.playingSongs;
			}

			this.playlistMore = (result.more?.section_id && result.more?.next_from) ? result.more : null;

			return result.audios;
		},

		setVkMixSectionId(sectionId: string | null) {
			this.vkMixSectionId = sectionId;
		},

		nextPlaylist() {
			// TODO: Implement next playlist navigation
		},

		prevPlaylist() {
			// TODO: Implement previous playlist navigation
		},

		async loadUserPlaylists(ownerId: number, force = false): Promise<TPlaylist[]> {
			if (!force && this.userPlaylistsOwnerId === ownerId && this.userPlaylists.length > 0) {
				return this.userPlaylists;
			}

			const result = await authenticatedFetch<{ count: number; playlists: TPlaylist[] }>("/api/vk/playlists", {
				params: {
					owner_id: ownerId
				}
			}).catch(() => null);

			if (result?.playlists) {
				this.userPlaylists = result.playlists;
				this.userPlaylistsOwnerId = ownerId;
				return this.userPlaylists;
			}

			return [];
		},

		getUserPlaylists(ownerId: number): TPlaylist[] {
			// Если плейлисты загружены для этого пользователя, возвращаем их
			if (this.userPlaylistsOwnerId === ownerId) {
				return this.userPlaylists;
			}

			// Иначе возвращаем пустой массив (загрузка должна быть вызвана через loadUserPlaylists)
			return [];
		},

		async createPlaylist(params: {
			title: string;
			description?: string;
			cover?: string;
		}) {
			const result = await authenticatedFetch<TPlaylist>("/api/vk/playlists/create", {
				method: "POST",
				body: params
			});

			if (result && this.userPlaylistsOwnerId === useVkStore().user_id) {
				this.userPlaylists.push(result);
			}

			if (isTauri() && typeof window !== "undefined") {
				const { useTray } = await import("~/composables/useTray");
				await useTray().loadPlaylists().catch(() => { });
			}

			return result;
		},

		async editPlaylist(params: {
			playlist_id: number;
			title?: string;
			description?: string;
			cover?: string;
			no_discover?: boolean;
		}) {
			const result = await authenticatedFetch("/api/vk/playlists/edit", {
				method: "POST",
				body: params
			});

			if (this.userPlaylistsOwnerId !== null) {
				const playlistIndex = this.userPlaylists.findIndex(p => p.playlist_id === params.playlist_id);
				if (playlistIndex >= 0 && this.userPlaylists[playlistIndex]) {
					if (params.title) {
						this.userPlaylists[playlistIndex].title = params.title;
					}
					if (params.description) {
						this.userPlaylists[playlistIndex].description = params.description;
					}
					if (params.cover) {
						this.userPlaylists[playlistIndex].cover_url = params.cover;
					}
				}
			}

			if (isTauri() && typeof window !== "undefined") {
				const { useTray } = await import("~/composables/useTray");
				await useTray().loadPlaylists().catch(() => { });
			}

			return result;
		},

		async deletePlaylist(playlist: TPlaylist) {
			const result = await authenticatedFetch<{ success: boolean }>("/api/vk/playlists/delete", {
				method: "POST",
				body: {
					playlist_id: playlist.playlist_id,
					owner_id: playlist.owner_id,
					edit_hash: playlist.edit_hash
				}
			});

			if (result.success && this.userPlaylistsOwnerId === playlist.owner_id) {
				const playlistIndex = this.userPlaylists.findIndex(p =>
					p.playlist_id === playlist.playlist_id && p.owner_id === playlist.owner_id
				);
				if (playlistIndex >= 0) {
					this.userPlaylists.splice(playlistIndex, 1);
				}
			}

			if (isTauri() && typeof window !== "undefined") {
				const { useTray } = await import("~/composables/useTray");
				await useTray().loadPlaylists().catch(() => { });
			}

			return result;
		},

		async followPlaylist(playlist: TPlaylist) {
			const result = await authenticatedFetch("/api/vk/playlists/follow", {
				method: "POST",
				body: {
					playlist_id: playlist.playlist_id,
					owner_id: playlist.owner_id,
					access_hash: playlist.access_hash || ""
				}
			});

			if (this.userPlaylistsOwnerId === playlist.owner_id) {
				const playlistIndex = this.userPlaylists.findIndex(p =>
					p.playlist_id === playlist.playlist_id && p.owner_id === playlist.owner_id
				);
				if (playlistIndex >= 0 && this.userPlaylists[playlistIndex]) {
					this.userPlaylists[playlistIndex].followed = true;
				}
			}

			if (isTauri() && typeof window !== "undefined") {
				const { useTray } = await import("~/composables/useTray");
				await useTray().loadPlaylists().catch(() => { });
			}

			return result;
		},

		async unfollowPlaylist(playlist: TPlaylist) {
			const result = await authenticatedFetch("/api/vk/playlists/unfollow", {
				method: "POST",
				body: {
					playlist_id: playlist.playlist_id,
					owner_id: playlist.owner_id
				}
			});

			if (this.userPlaylistsOwnerId === playlist.owner_id) {
				const playlistIndex = this.userPlaylists.findIndex(p =>
					p.playlist_id === playlist.playlist_id && p.owner_id === playlist.owner_id
				);
				if (playlistIndex >= 0 && this.userPlaylists[playlistIndex]) {
					this.userPlaylists[playlistIndex].followed = false;
				}
			}

			if (isTauri() && typeof window !== "undefined") {
				const { useTray } = await import("~/composables/useTray");
				await useTray().loadPlaylists().catch(() => { });
			}

			return result;
		},

		async reorderPlaylist(params: {
			playlist_id: number;
			prev_playlist_id: number;
		}) {
			return await authenticatedFetch<{ success: boolean }>("/api/vk/playlists/reorder", {
				method: "POST",
				body: params
			});
		},

		async addSongToPlaylist(audio: TAudio, playlist: TPlaylist) {
			return await authenticatedFetch("/api/vk/playlists/add-song", {
				method: "POST",
				body: {
					...createAudioBody(audio),
					playlist_id: playlist.playlist_id,
					playlist_owner_id: playlist.owner_id
				}
			});
		},

		async removeSongFromPlaylist(audio: TAudio, playlist: TPlaylist) {
			return await authenticatedFetch("/api/vk/playlists/remove-song", {
				method: "POST",
				body: {
					...createAudioBody(audio),
					playlist_id: playlist.playlist_id,
					playlist_owner_id: playlist.owner_id
				}
			});
		},

		async reorderSongsInPlaylist(params: {
			playlist_id: number;
			Audios?: string;
			force?: boolean;
		}) {
			return await authenticatedFetch("/api/vk/playlists/reorder-songs", {
				method: "POST",
				body: params
			});
		},

		async downloadPlaylist(playlist: TPlaylist) {
			const clientType = isTauri() ? "tauri" : "browser";

			const response = await authenticatedFetch<{ success: boolean; downloadId?: string }>("/api/vk/playlists/download", {
				method: "POST",
				headers: {
					"X-Client-Type": clientType
				},
				body: {
					playlist_id: playlist.playlist_id,
					owner_id: playlist.owner_id,
					access_hash: playlist.access_hash
				}
			});

			if (response.success) {
				const downloadsStore = useDownloadsStore();
				await downloadsStore.fetchQueue();
			}

			return response;
		},

		async downloadLibrary(ownerId: number) {
			return await this.downloadPlaylist({
				owner_id: ownerId,
				playlist_id: -1,
				raw_id: `${ownerId}_-1`,
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
				access_hash: "",
				follow_hash: "",
				edit_hash: "",
				list: [],
				more: null
			});
		},

		async loadPlaylist(ownerId: number, playlistId: number, accessHash?: string, sourcePlaylist?: TPlaylist) {
			// Для поиска (playlist_id === -1 и owner_id === 0) не загружаем через API
			// Используем текущий плейлист из store
			if (playlistId === -1 && ownerId === 0) {
				if (this.current && this.current.raw_id.startsWith("search_")) {
					return this.current;
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

				return playlist;
			}

			const playlist = await authenticatedFetch<TPlaylist>(`/api/vk/playlists/${ownerId}/${playlistId}`, {
				params: {
					list: true,
					...(accessHash ? { access_hash: accessHash } : {})
				}
			});

			return playlist;
		},

		async setQueue(songs: TAudio[], playlist?: TPlaylist, startIndex?: number) {
			// Устанавливаем плейлист, если передан
			// ВАЖНО: устанавливаем плейлист ДО setSongs, чтобы playing был обновлен
			if (playlist) {
				// Обновляем плейлист с актуальным списком треков
				const updatedPlaylist = { ...playlist, list: songs };
				await this.setCurrent(updatedPlaylist);
				await this.setPlaying(updatedPlaylist);
			}

			// Устанавливаем очередь треков (setSongs автоматически фильтрует restricted треки)
			this.setSongs(songs);

			// Устанавливаем индекс, если передан
			// Используем playingSongs для получения правильного индекса после фильтрации
			if (startIndex !== undefined && startIndex >= 0 && startIndex < songs.length) {
				// Находим трек по индексу в исходном списке
				const targetSong = songs[startIndex];

				if (targetSong) {
					// Используем поле _index из трека для быстрого доступа
					const targetSongWithIndex = targetSong as TAudio & { _index?: number };
					const filteredIndex = targetSongWithIndex._index !== undefined && targetSongWithIndex._index >= 0 && targetSongWithIndex._index < this.playingSongs.length
						? targetSongWithIndex._index
						: this.playingSongs.findIndex(s => s.full_id === targetSong.full_id);

					if (filteredIndex >= 0) {
						this.setCurrentIndex(filteredIndex);
					} else {
						// Если трек не найден (возможно, был отфильтрован), используем первый доступный
						this.setCurrentIndex(0);
					}
				} else {
					this.setCurrentIndex(0);
				}
			}
		},

		async playFromQueue(song: TAudio, songs: TAudio[], playlist?: TPlaylist, forceUpdate = false) {
			const playerStore = usePlayerStore();

			// Проверяем, не является ли трек уже частью играющего плейлиста
			const isSamePlaylist = playlist && this.playing && this.playing.raw_id === playlist.raw_id;
			// Используем поле _index из трека для быстрого доступа
			const songWithIndex = song as TAudio & { _index?: number };
			const existingIndex = songWithIndex._index !== undefined && songWithIndex._index >= 0 && songWithIndex._index < this.playingSongs.length
				? songWithIndex._index
				: this.playingSongs.findIndex((s: TAudio) => s.full_id === song.full_id);

			// Если трек уже в играющем плейлисте и не требуется принудительное обновление,
			// просто обновляем индекс и воспроизводим
			if (isSamePlaylist && existingIndex >= 0 && !forceUpdate) {
				if (playlist) {
					await this.setCurrent({ ...playlist, list: songs });
				}

				this.setCurrentIndex(existingIndex);

				// Используем трек из очереди, который уже имеет все данные (включая URL)
				const songFromQueue = this.playingSongs[existingIndex];

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
			await this.setQueue(songs, playlist, startIndex);

			// После setQueue индекс уже должен быть установлен правильно
			// Но на всякий случай проверяем и используем трек из очереди
			const actualIndex = this.currentIndex >= 0 && this.currentIndex < this.playingSongs.length
				? this.currentIndex
				: 0;

			// Используем трек из очереди, который уже имеет все данные (включая URL)
			// Если трек не найден в отфильтрованной очереди, используем исходный
			const songToPlay = this.playingSongs[actualIndex] || song;

			// Добавляем информацию о плейлисте в трек и помечаем как manual
			// manual: true гарантирует, что updatePlaylist не будет вызван в playerStore.play
			await playerStore.play({ ...songToPlay, from: playlist, manual: true } as TSongWithFrom);
		},

		appendToQueue(songs: TAudio[]) {
			// Фильтруем restricted треки напрямую без промежуточной переменной
			for (let i = 0; i < songs.length; i++) {
				const song = songs[i];
				if (song && !song.is_restriction) {
					this.addSong(song);
				}
			}

			// Обновляем список треков в плейлисте для синхронизации
			// Используем прямое присваивание для лучшей производительности и освобождения памяти
			if (this.playing) {
				this.playing.list = this.playingSongs;
			}
		},

		async updatePlaylist(song: TSongWithFrom) {
			const playerStore = usePlayerStore();

			// ПЕРВЫМ ДЕЛОМ проверяем, не находится ли трек уже в очереди воспроизведения
			// Это предотвращает очистку очереди при переключении треков из очереди
			// Используем поле _index из трека для быстрого доступа
			const songWithIndex = song as TAudio & { _index?: number };
			const songIndex = songWithIndex._index !== undefined && songWithIndex._index >= 0 && songWithIndex._index < this.playingSongs.length
				? songWithIndex._index
				: this.playingSongs.findIndex((s: TAudio) => s.full_id === song.full_id);
			if (songIndex >= 0) {
				// Трек уже в очереди, просто обновляем индекс если нужно
				if (this.currentIndex !== songIndex) {
					this.setCurrentIndex(songIndex);
				}
				return false;
			}

			// Если это ручное воспроизведение плейлиста, не обновляем через updatePlaylist
			// так как плейлист уже установлен в playPlaylist или playFromPlaylist
			if (song.manual && song.from && typeof song.from === "object") {
				return false;
			}

			// Если нет текущего плейлиста или трек из очереди/vkmix, не обновляем
			if (!this.current) {
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
			if (this.playing && this.current.raw_id === this.playing.raw_id) {
				return false;
			}

			// Если текущий плейлист отличается от играющего, обновляем
			if (this.current.raw_id !== this.playing?.raw_id) {
				// Если трек имеет from как объект плейлиста, используем его
				if (songFrom && typeof songFrom === "object") {
					if (songFrom.list && songFrom.list.length > 0) {
						const songIndexInList = songFrom.list.findIndex((s: TAudio) => s.full_id === song.full_id);
						await this.setQueue(songFrom.list, songFrom, songIndexInList >= 0 ? songIndexInList : undefined);
					}

					return true;
				}

				// Для поиска (raw_id начинается с "search_") используем текущий плейлист напрямую
				const isSearchPlaylist = this.current.raw_id.startsWith("search_");
				if (isSearchPlaylist && this.current.list && this.current.list.length > 0) {
					const songIndexInList = this.current.list.findIndex((s: TAudio) => s.full_id === song.full_id);
					await this.setQueue(this.current.list, this.current, songIndexInList >= 0 ? songIndexInList : undefined);
					return true;
				}

				// Если трек имеет from как строку (не queue/vkmix), загружаем текущий плейлист
				if (songFrom && typeof songFrom === "string") {
					// Для библиотеки пользователя (playlist_id === -1) используем треки из current.list, если они есть
					// но только если owner_id совпадает с owner_id трека, чтобы не использовать треки другого пользователя
					if (this.current.playlist_id === -1 && this.current.list && this.current.list.length > 0) {
						// Проверяем, что owner_id плейлиста совпадает с owner_id трека
						if (this.current.owner_id === song.owner_id) {
							const songIndexInList = this.current.list.findIndex((s: TAudio) => s.full_id === song.full_id);
							await this.setQueue(this.current.list, this.current, songIndexInList >= 0 ? songIndexInList : undefined);
							return true;
						}
					}

					const currentPlaylist = await this.loadPlaylist(
						this.current.owner_id,
						this.current.playlist_id,
						this.current.access_hash
					);

					// Для библиотеки пользователя (playlist_id === -1) сохраняем title из current плейлиста
					// так как API может не вернуть правильное имя пользователя
					if (currentPlaylist.playlist_id === -1 && this.current.title && this.current.title !== currentPlaylist.title) {
						currentPlaylist.title = this.current.title;
						currentPlaylist.cover_url = this.current.cover_url || currentPlaylist.cover_url;
					}

					if (currentPlaylist.list && currentPlaylist.list.length > 0) {
						const songIndexInList = currentPlaylist.list.findIndex((s: TAudio) => s.full_id === song.full_id);
						await this.setQueue(currentPlaylist.list, currentPlaylist, songIndexInList >= 0 ? songIndexInList : undefined);
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
		},

		async playPlaylist(playlist: TPlaylist, startIndex = 0, randomStart = false) {
			const playerStore = usePlayerStore();

			// Проверяем, не переключаемся ли мы на тот же плейлист
			const isSamePlaylist = this.playing &&
				this.playing.owner_id === playlist.owner_id &&
				this.playing.playlist_id === playlist.playlist_id &&
				(this.playing.raw_id === playlist.raw_id ||
					(!playlist.raw_id && `${this.playing.owner_id}_${this.playing.playlist_id}` === `${playlist.owner_id}_${playlist.playlist_id}`));

			// Если плейлист уже играет и треки загружены, просто переключаемся на нужный трек
			// НО только если очередь тоже установлена (playingSongs не пуста)
			if (isSamePlaylist && this.playing && this.playing.list && this.playing.list.length > 0 && this.playingSongs.length > 0) {
				let validIndex = startIndex < this.playing.list.length ? startIndex : 0;

				if (randomStart && this.playing.list.length > 0) {
					validIndex = Math.floor(Math.random() * this.playing.list.length);
				}

				const targetSong = this.playing.list[validIndex];

				if (targetSong) {
					// Используем поле _index из трека для быстрого доступа
					const targetSongWithIndex = targetSong as TAudio & { _index?: number };
					const foundIndex = targetSongWithIndex._index !== undefined && targetSongWithIndex._index >= 0 && targetSongWithIndex._index < this.playingSongs.length
						? targetSongWithIndex._index
						: this.playingSongs.findIndex(s => s.full_id === targetSong.full_id);

					// Если трек найден в отфильтрованной очереди, используем его индекс
					// Если не найден (отфильтрован), выбираем случайный из доступных
					let actualIndex = 0;
					if (foundIndex >= 0) {
						actualIndex = foundIndex;
					} else if (randomStart && this.playingSongs.length > 0) {
						// Если рандомный старт и трек отфильтрован, выбираем случайный из доступных
						actualIndex = Math.floor(Math.random() * this.playingSongs.length);
					}

					this.setCurrentIndex(actualIndex);

					const song = this.playingSongs[actualIndex];
					if (song && (!playerStore.song || playerStore.song.full_id !== song.full_id)) {
						await playerStore.play({ ...song, from: this.playing, manual: true } as TSongWithFrom);
					}
				}
				return;
			}

			// Если плейлист тот же, но очередь пуста - переустанавливаем очередь
			if (isSamePlaylist && this.playing && this.playing.list && this.playing.list.length > 0 && this.playingSongs.length === 0) {
				let validIndex = startIndex < this.playing.list.length ? startIndex : 0;

				if (randomStart && this.playing.list.length > 0) {
					validIndex = Math.floor(Math.random() * this.playing.list.length);
				}

				await this.setQueue(this.playing.list, this.playing, validIndex);

				// Используем индекс, который был установлен в setQueue
				const actualIndex = this.currentIndex >= 0 && this.currentIndex < this.playingSongs.length
					? this.currentIndex
					: 0;

				const song = this.playingSongs[actualIndex];
				if (song) {
					await playerStore.play({ ...song, from: this.playing, manual: true } as TSongWithFrom);
				}
				return;
			}

			// Для библиотеки пользователя (playlist_id === -1) проверяем, есть ли треки
			// Если треков нет, загружаем их через API
			let currentPlaylist: TPlaylist;
			if (playlist.playlist_id === -1 && playlist.title && playlist.list && playlist.list.length > 0) {
				// Используем переданный плейлист, если в нем уже есть треки
				currentPlaylist = playlist;
			} else {
				// ВСЕГДА загружаем плейлист заново, чтобы получить полный список треков
				// даже если в playlist.list уже есть треки, они могут быть неполными
				// Для библиотеки пользователя это особенно важно, так как треки могут не быть загружены
				currentPlaylist = await this.loadPlaylist(
					playlist.owner_id,
					playlist.playlist_id,
					playlist.access_hash,
					playlist
				);
			}

			// Если переключаемся на плейлист, который не является VK Mix, очищаем vkMixSectionId
			const isVkMix = currentPlaylist.playlist_id === -9 || String(currentPlaylist.owner_id) === "vkmix";
			if (!isVkMix) {
				this.setVkMixSectionId(null);
			}

			// Сохраняем title и cover_url из переданного плейлиста, если они есть
			if (playlist.title && playlist.title !== currentPlaylist.title) {
				currentPlaylist.title = playlist.title;
			}
			if (playlist.cover_url && playlist.cover_url !== currentPlaylist.cover_url) {
				currentPlaylist.cover_url = playlist.cover_url;
			}

			// Устанавливаем текущий плейлист
			await this.setCurrent(currentPlaylist);
			// Устанавливаем плейлист
			await this.setPlaying(currentPlaylist);

			// Используем треки из currentPlaylist.list, которые уже загружены через loadPlaylist
			// Треки приходят без URL (withUrls: false), URL будет загружаться в момент проигрывания
			if (currentPlaylist.list && currentPlaylist.list.length > 0) {
				let validIndex = startIndex < currentPlaylist.list.length ? startIndex : 0;

				if (randomStart && currentPlaylist.list.length > 0) {
					validIndex = Math.floor(Math.random() * currentPlaylist.list.length);
				}

				await this.setQueue(currentPlaylist.list, currentPlaylist, validIndex);

				// Используем индекс, который был установлен в setQueue
				// setQueue уже правильно установил индекс после фильтрации restricted треков
				const actualIndex = this.currentIndex >= 0 && this.currentIndex < this.playingSongs.length
					? this.currentIndex
					: 0;

				const song = this.playingSongs[actualIndex];

				if (song) {
					// Добавляем информацию о плейлисте в трек
					await playerStore.play({ ...song, from: currentPlaylist, manual: true } as TSongWithFrom);
				} else {
					console.error("[PLAY_PLAYLIST] No song found!", {
						actualIndex,
						queueLength: this.playingSongs.length,
						currentIndex: this.currentIndex
					});
				}
			} else {
				// Если плейлист пустой, очищаем очередь
				await this.setQueue([], currentPlaylist);
			}
		},

		async playFromPlaylist(song: TAudio, playlist: TPlaylist) {
			const playerStore = usePlayerStore();

			// ПЕРВЫМ ДЕЛОМ проверяем, не находится ли трек уже в очереди воспроизведения
			// Это предотвращает очистку очереди при переключении треков из очереди
			// Используем поле _index из трека для быстрого доступа
			const songWithIndex = song as TAudio & { _index?: number };
			const songIndex = songWithIndex._index !== undefined && songWithIndex._index >= 0 && songWithIndex._index < this.playingSongs.length
				? songWithIndex._index
				: this.playingSongs.findIndex((s: TAudio) => s.full_id === song.full_id);
			if (songIndex >= 0) {
				// Трек уже в очереди, просто обновляем индекс если нужно
				if (this.currentIndex !== songIndex) {
					this.setCurrentIndex(songIndex);
				}
				// Используем трек из очереди, который уже имеет все данные (включая URL)
				const songFromQueue = this.playingSongs[songIndex];
				if (songFromQueue) {
					await playerStore.play({
						...songFromQueue,
						from: this.playing || playlist,
						manual: true
					} as TSongWithFrom);
				}
				return;
			}

			// Если переключаемся на плейлист, который не является VK Mix, очищаем vkMixSectionId
			const isVkMix = playlist.playlist_id === -9 || String(playlist.owner_id) === "vkmix";

			if (!isVkMix) {
				this.setVkMixSectionId(null);
			}

			// Для библиотеки пользователя (playlist_id === -1) используем переданный плейлист напрямую
			// так как он уже имеет правильный title (имя и фамилия пользователя)
			if (playlist.playlist_id === -1 && playlist.title) {
				// Устанавливаем плейлист в store, чтобы title отображался правильно
				await this.setCurrent(playlist);
				await this.setPlaying(playlist);

				// Если треки уже есть, используем их, но только если owner_id совпадает
				// чтобы не использовать треки другого пользователя
				if (playlist.list && playlist.list.length > 0 && playlist.owner_id === song.owner_id) {
					// Проверяем, что все треки в списке имеют правильный owner_id
					// Фильтруем напрямую без промежуточной переменной
					const validTracks: TAudio[] = [];
					for (let i = 0; i < playlist.list.length; i++) {
						const track = playlist.list[i];
						if (track && track.owner_id === song.owner_id) {
							validTracks.push(track);
						}
					}
					if (validTracks.length > 0) {
						await this.playFromQueue(song, validTracks, playlist);
						return;
					}
				}
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
				if (this.current &&
					this.current.playlist_id === -1 &&
					this.current.owner_id === playlist.owner_id &&
					this.current.list &&
					this.current.list.length > 0) {
					// Используем треки из current плейлиста, которые уже загружены
					tracksData = {
						audios: this.current.list,
						more: this.playlistMore
					};
				}
			}
			// Для обычных плейлистов проверяем, есть ли треки в current плейлисте
			else {
				if (this.current &&
					this.current.owner_id === playlist.owner_id &&
					this.current.playlist_id === playlist.playlist_id &&
					this.current.list &&
					this.current.list.length > 0) {
					// Используем треки из current плейлиста, которые уже загружены
					tracksData = {
						audios: this.current.list,
						more: this.playlistMore
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
				this.setPlaylistMore(tracksData.more);
			} else {
				this.setPlaylistMore(null);
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
			await this.setCurrent(updatedPlaylist);
			await this.setPlaying(updatedPlaylist);

			// Используем универсальный метод для воспроизведения из очереди
			await this.playFromQueue(song, queueSongs, updatedPlaylist);
		},

		formatListens(listens: number): string {
			if (listens >= 1000000) {
				return `${(listens / 1000000).toFixed(1)}M`;
			}
			if (listens >= 1000) {
				return `${(listens / 1000).toFixed(1)}K`;
			}
			return String(listens);
		},

		async addSongToLibrary(audio: TAudio, options?: {
			songsContext?: any;
			collectionData?: any;
			playlistData?: any;
			playlistInfo?: any;
			playlistAudiosComputed?: any;
		}) {
			const vkStore = useVkStore();
			const audioStore = useAudioStore();

			const audioForApi = audio.owner_id !== vkStore.user_id
				? audio
				: {
					...audio,
					owner_id: (audio as any).original_owner_id || audio.owner_id,
					full_id: `${(audio as any).original_owner_id || audio.owner_id}_${audio.id}`
				};

			const updatedSong = await audioStore.addAudio(audioForApi).catch(console.error);

			if (updatedSong) {
				const updatedTrack = {
					...audio,
					addedSong: updatedSong,
					can_add: updatedSong.can_add,
					can_delete: updatedSong.can_delete
				};

				this.updateTrackInAllPlaces(audio.id, () => updatedTrack, false, {
					songsContext: options?.songsContext,
					collectionData: options?.collectionData,
					playlistData: options?.playlistData,
					playlistInfo: options?.playlistInfo,
					playlistAudiosComputed: options?.playlistAudiosComputed
				});
			}
		},

		isInLibrary(audio: TAudio): boolean {
			const vkStore = useVkStore();
			return Boolean(audio.addedSong) || audio.owner_id === vkStore.user_id;
		},

		shouldRemoveFromPlaylist(audio: TAudio, playlist: TPlaylist | null): boolean {
			if (!playlist) {
				return false;
			}

			const vkStore = useVkStore();
			const inLibrary = this.isInLibrary(audio);

			return playlist.playlist_id >= 0
				&& playlist.owner_id === vkStore.user_id
				&& !inLibrary
				&& !audio.addedSong;
		},

		async deleteSong(audio: TAudio, options?: {
			songsContext?: any;
			collectionData?: any;
			playlistData?: any;
			playlistInfo?: any;
			playlistAudiosComputed?: any;
		}): Promise<{ success: boolean } | null> {
			const audioStore = useAudioStore();
			const route = useRoute();

			const playlist = this.playing || this.current;
			const inLibrary = this.isInLibrary(audio);
			const removeFromPlaylist = this.shouldRemoveFromPlaylist(audio, playlist);

			let result: { success: boolean } | null = null;

			if (removeFromPlaylist) {
				if (!playlist) {
					return null;
				}

				result = await this.removeSongFromPlaylist(audio, playlist).catch(console.error) || null;

				if (result?.success && playlist.size !== undefined) {
					playlist.size = Math.max(0, (playlist.size || 0) - 1);
				}
			} else if (inLibrary) {
				const songToDelete = audio.addedSong || audio;

				result = await audioStore.deleteAudio(songToDelete).catch(console.error) || null;

				if (result?.success) {
					const userLibraryPage = isUserLibraryPage(route.path);

					if (userLibraryPage) {
						this.updateTrackInAllPlaces(audio.id, () => null, true, {
							songsContext: options?.songsContext,
							collectionData: options?.collectionData,
							playlistData: options?.playlistData,
							playlistInfo: options?.playlistInfo,
							playlistAudiosComputed: options?.playlistAudiosComputed,
							route
						});
					} else {
						this.updateTrackInAllPlaces(audio.id, (track) => {
							const { addedSong, ...trackWithoutAddedSong } = track;
							return {
								...trackWithoutAddedSong,
								can_add: true,
								can_delete: false
							};
						}, false, {
							songsContext: options?.songsContext,
							collectionData: options?.collectionData,
							playlistData: options?.playlistData,
							playlistInfo: options?.playlistInfo,
							playlistAudiosComputed: options?.playlistAudiosComputed,
							route
						});
					}
				}
			}

			if (result?.success) {
				this.removeSongByFullId(audio.full_id);

				if (this.currentSong && this.currentSong.full_id === audio.full_id) {
					this.next();
				}
			}

			return result;
		},

		getDeleteTitle(audio: TAudio): string {
			const vkStore = useVkStore();
			const playlist = this.playing || this.current;

			if (playlist && playlist.playlist_id >= 0 && playlist.owner_id === vkStore.user_id) {
				return "Удалить из плейлиста";
			}

			return "Удалить из библиотеки";
		},

		canDelete(audio: TAudio, songProps: { canDelete: boolean }): boolean {
			const vkStore = useVkStore();
			if (songProps.canDelete || audio.canDelete) {
				return true;
			}

			const playlist = this.playing || this.current;
			if (playlist && playlist.playlist_id >= 0 && playlist.owner_id === vkStore.user_id) {
				return true;
			}

			return false;
		},

		updateTrackInAllPlaces(
			trackId: number,
			updater: (track: TAudio) => TAudio | null,
			shouldRemoveFromList = false,
			options?: {
				songsContext?: Ref<TAudio[]> | ComputedRef<TAudio[]> | undefined;
				collectionData?: Ref<TParsedPayload | null> | undefined;
				playlistData?: Ref<TParsedPayload | null> | undefined;
				playlistInfo?: Ref<TPlaylist | null> | undefined;
				playlistAudiosComputed?: ComputedRef<TAudio[]> | undefined;
				route?: ReturnType<typeof useRoute>;
			}
		) {
			const playerStore = usePlayerStore();
			const searchStore = useSearchStore();
			const route = options?.route || useRoute();
			const songsContext = options?.songsContext;
			const collectionData = options?.collectionData;
			const playlistData = options?.playlistData;
			const playlistInfo = options?.playlistInfo;
			const playlistAudiosComputed = options?.playlistAudiosComputed;

			// Ищем по id (он не меняется) - используем прямую проверку вместо функции
			const findTrackIndex = (tracks: TAudio[]): number => {
				for (let i = 0; i < tracks.length; i++) {
					if (tracks[i]?.id === trackId) {
						return i;
					}
				}
				return -1;
			};

			// Обновляем в songsContext
			if (songsContext?.value) {
				const index = findTrackIndex(songsContext.value);
				if (index >= 0) {
					const track = songsContext.value[index];
					if (track) {
						const updated = updater(track);

						// Обновляем в исходных данных (если songsContext - это computed)
						// Обновляем в результатах поиска
						// Удаляем из исходных данных ТОЛЬКО если shouldRemoveFromList === true
						// Иначе только обновляем (не удаляем)
						if (isSearchPage(route.path) && searchStore.results) {
							// Обновляем в categories
							if (searchStore.results.categories) {
								for (const category of searchStore.results.categories) {
									if (category.audios) {
										const audioIndex = findTrackIndex(category.audios);
										if (audioIndex >= 0) {
											if (updated === null && shouldRemoveFromList) {
												category.audios.splice(audioIndex, 1);
											} else if (updated !== null) {
												category.audios[audioIndex] = updated;
											}
											break;
										}
									}
								}
							}
							// Обновляем в audios (обратная совместимость)
							if (searchStore.results.audios) {
								const audioIndex = findTrackIndex(searchStore.results.audios);
								if (audioIndex >= 0) {
									if (updated === null && shouldRemoveFromList) {
										searchStore.results.audios.splice(audioIndex, 1);
									} else if (updated !== null) {
										searchStore.results.audios[audioIndex] = updated;
									}
								}
							}
						}

						// Флаг, указывающий, обновили ли мы данные напрямую
						let updatedDirectly = false;

						// Обновляем в данных библиотеки
						if (isUserLibraryPage(route.path)) {
							const injectedData = route.path.startsWith("/collection") ? collectionData : playlistData;

							if (injectedData?.value?.audios) {
								const audioIndex = findTrackIndex(injectedData.value.audios);
								if (audioIndex >= 0) {
									if (updated === null && shouldRemoveFromList) {
										injectedData.value.audios.splice(audioIndex, 1);
										triggerRef(injectedData as Ref);
										if (playlistAudiosComputed) {
											triggerRef(playlistAudiosComputed as any);
										}
										updatedDirectly = true;
									} else if (updated !== null) {
										injectedData.value.audios[audioIndex] = updated;
										triggerRef(injectedData as Ref);
										updatedDirectly = true;
									}
								}
							}

							// ВАЖНО: также обновляем playlistInfo.list (если оно есть)
							if (playlistInfo?.value?.list && Array.isArray(playlistInfo.value.list)) {
								const listIndex = findTrackIndex(playlistInfo.value.list);

								if (listIndex >= 0) {
									if (updated === null && shouldRemoveFromList) {
										playlistInfo.value.list.splice(listIndex, 1);
									} else if (updated !== null) {
										playlistInfo.value.list[listIndex] = updated;
									}
								}
							}
						}

						// Также обновляем в computed массиве (для немедленной реактивности)
						// НО только если мы НЕ обновили данные напрямую (иначе будет двойное обновление)
						if (!updatedDirectly) {
							if (updated === null) {
								songsContext.value.splice(index, 1);
							} else {
								songsContext.value.splice(index, 1, updated);
							}
						}
					}
				}
			}

			// Обновляем в текущем плейлисте
			if (this.current?.list) {
				const index = findTrackIndex(this.current.list);
				if (index >= 0) {
					const track = this.current.list[index];
					if (track) {
						const updated = updater(track);
						if (updated === null) {
							this.current.list.splice(index, 1);
						} else {
							this.current.list[index] = updated;
						}
					}
				}
			}

			// Обновляем в playing плейлисте
			if (this.playing?.list) {
				const index = findTrackIndex(this.playing.list);
				if (index >= 0) {
					const track = this.playing.list[index];
					if (track) {
						const updated = updater(track);
						if (updated === null) {
							this.playing.list.splice(index, 1);
						} else {
							this.playing.list[index] = updated;
						}
					}
				}
			}

			// Обновляем в очереди воспроизведения
			const queueIndex = findTrackIndex(this.playingSongs);
			if (queueIndex >= 0) {
				const track = this.playingSongs[queueIndex];
				if (track) {
					const updated = updater(track);
					if (updated === null) {
						this.playingSongs.splice(queueIndex, 1);
					} else {
						this.playingSongs[queueIndex] = updated;
					}
				}
			}

			// Обновляем в playerStore
			if (playerStore.song?.id === trackId) {
				const updated = updater(playerStore.song);
				if (updated !== null) {
					playerStore.song = updated;
				}
			}
		},

		async normalizePlaylist(playlist: TPlaylist): Promise<TPlaylist> {
			const vkStore = useVkStore();
			const normalized = { ...playlist };

			const getString = (path: string): string => {
				if (typeof window === "undefined" || typeof useNuxtApp === "undefined") {
					return path;
				}

				try {
					const nuxtApp = useNuxtApp();
					const $getString = nuxtApp.vueApp?.config?.globalProperties?.$getString as ((path: string) => string) | undefined;

					if ($getString) {
						return $getString(path);
					}

					const i18nPlugin = nuxtApp.$i18n as { getString?: (path: string) => string } | undefined;
					if (i18nPlugin?.getString) {
						return i18nPlugin.getString(path);
					}
				} catch {
					// Если не удалось получить getString, возвращаем путь
				}

				return path;
			};

			// Определяем title
			if (playlist.raw_id.startsWith("search_")) {
				normalized.title = getString("queue.source.search");
			} else if (playlist.playlist_id === -9 || String(playlist.owner_id) === "vkmix") {
				normalized.title = getString("queue.source.vkMix");
			} else if (playlist.playlist_id === -1) {
				// Плейлист пользователя - показываем имя пользователя
				if (playlist.author?.name) {
					normalized.title = playlist.author.name;
				} else if (playlist.owner_id === vkStore.user_id && vkStore.user) {
					normalized.title = getUserFullName(vkStore.user);
				} else {
					normalized.title = playlist.title || getString("queue.source.myMusic");
				}
			} else if (playlist.context) {
				const contextMap: Record<string, string> = {
					"wall": getString("queue.source.wall"),
					"feed": getString("queue.source.feed"),
					"updates": getString("queue.source.updates"),
					"general": getString("queue.source.general"),
					"artist": getString("queue.source.artist"),
					"popular": getString("queue.source.popular")
				};
				normalized.title = contextMap[playlist.context] || playlist.title;
			}

			// Определяем description
			if (playlist.raw_id.startsWith("search_")) {
				normalized.description = playlist.raw_id.replace("search_", "");
			} else if (playlist.playlist_id === -1) {
				normalized.description = getString("queue.source.userPlaylist");
			}

			// Определяем cover_url для плейлиста пользователя
			// Если cover_url не установлен или пустой, устанавливаем его из фото пользователя
			if (playlist.playlist_id === -1 && (!normalized.cover_url || normalized.cover_url.trim() === "")) {
				// Для текущего пользователя используем данные из vkStore
				if (playlist.owner_id === vkStore.user_id && vkStore.user) {
					normalized.cover_url = vkStore.user.photo_200 || vkStore.user.photo_max || vkStore.user.avatar || "";
				} else if (playlist.owner_id > 0) {
					// Для других пользователей получаем информацию через API
					const users = await $fetch<Array<{
						id: number;
						first_name: string;
						last_name: string;
						photo_200?: string;
						photo_max?: string;
					}>>("/api/vk/users", {
						query: {
							user_ids: playlist.owner_id.toString(),
							fields: "photo_200,photo_max"
						}
					}).catch(() => null);

					if (users && Array.isArray(users) && users.length > 0 && users[0]) {
						const user = users[0];
						normalized.cover_url = user.photo_200 || user.photo_max || "";
					}
				}
			}

			return normalized;
		}
	}
});

