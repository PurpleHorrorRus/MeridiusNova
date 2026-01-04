import type { TAudio } from "~~/server/api/vk/audio/types";
import type { TPlaylist, TMore } from "~~/server/utils/types";
import { normalizePlaylist } from "~/utils/playlist";

export const usePlaylistStore = defineStore("playlist", {
	state: () => ({
		current: null as TPlaylist | null,
		playing: null as TPlaylist | null,
		loaded: [] as TAudio[],
		playingSongs: [] as TAudio[],
		originalSongs: [] as TAudio[],
		currentIndex: -1,
		shuffle: false,
		repeat: false,
		vkMixSectionId: null as string | null,
		playlistMore: null as TMore | null
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
		}
	},

	actions: {
	async setCurrent(playlist: TPlaylist) {
		// Нормализуем плейлист (устанавливаем правильные title, description, cover_url)
		const normalizedPlaylist = await normalizePlaylist(playlist);
		
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
				this.current.list = normalizedPlaylist.list;
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
		
		this.current = normalizedPlaylist;
		this.loaded = normalizedPlaylist.list || [];
	},

	async setPlaying(playlist: TPlaylist) {
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
				cover_url: this.current.cover_url
			};
		} else {
			// Если current не установлен или это другой плейлист, нормализуем переданный
			this.playing = await normalizePlaylist(playlist);
		}
		
		// Очищаем оригинальные треки при смене плейлиста
		this.originalSongs = [];
		// Обновляем список треков в плейлисте из playingSongs, если они уже установлены
		// Это гарантирует синхронизацию, но не перезаписывает очередь
		if (this.playingSongs.length > 0) {
			this.playing.list = [...this.playingSongs];
		}
		// playingSongs обновляется через setSongs для гарантии правильного обновления очереди
	},

	setSongs(songs: TAudio[]) {
		// Фильтруем restricted треки при добавлении в очередь
		const filteredSongs = Array.isArray(songs) 
			? songs.filter(songItem => !songItem.is_restriction)
			: [];
		
		// Полностью заменяем массив для правильной реактивности
		// Создаем новый массив, чтобы гарантировать обновление реактивности
		this.playingSongs = [...filteredSongs];
		this.originalSongs = [];
		
		// НЕ обновляем playing.list здесь, так как это может привести к потере данных
		// playing.list должен обновляться только при установке плейлиста через setPlaying
		
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
			} else {
				this.playingSongs.push(song);
			}
		},

	removeSong(index: number) {
		if (index >= 0 && index < this.playingSongs.length) {
			this.playingSongs.splice(index, 1);

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

			if (this.currentIndex >= playingIndex) {
				this.currentIndex--;
			}

			// Обновляем список в playing плейлисте
			if (this.playing) {
				this.playing.list = [...this.playingSongs];
			}
		}

		// Удаляем из loaded
		const loadedIndex = this.loaded.findIndex(songItem => songItem.full_id === fullId);
		if (loadedIndex >= 0) {
			this.loaded.splice(loadedIndex, 1);

			// Обновляем список в current плейлисте
			if (this.current) {
				this.current.list = [...this.loaded];
			}
		}

		// Обновляем originalSongs если shuffle включен
		if (this.originalSongs.length > 0) {
			const originalIndex = this.originalSongs.findIndex(songItem => songItem.full_id === fullId);

			if (originalIndex >= 0) {
				this.originalSongs.splice(originalIndex, 1);
			}
		}
	},

	setCurrentIndex(index: number) {
		if (index >= 0 && index < this.playingSongs.length) {
			this.currentIndex = index;
		}
	},

		next() {
			if (this.playingSongs.length === 0) {
				return;
			}

			// Если индекс не установлен, устанавливаем на первый доступный трек
			if (this.currentIndex < 0) {
				const firstNonRestricted = this.playingSongs.findIndex((s: TAudio) => !s.is_restriction);

				if (firstNonRestricted >= 0) {
					this.currentIndex = firstNonRestricted;
				}

				return;
			}

			const currentIndex = this.currentIndex;
			
			// Получаем список доступных (не-restricted) индексов
			const availableIndices = this.playingSongs
				.map((s: TAudio, idx: number) => !s.is_restriction ? idx : -1)
				.filter((idx: number) => idx >= 0);

			if (availableIndices.length === 0) {
				return;
			}

			// Если только один доступный трек и не включен repeat, не переключаемся
			if (availableIndices.length === 1 && !this.repeat) {
				return;
			}

			let newIndex: number;

			if (this.shuffle) {
				// При shuffle выбираем случайный доступный трек, но не текущий
				const otherIndices = availableIndices.filter((idx: number) => idx !== currentIndex);
				
				if (otherIndices.length === 0) {
					// Если все треки кроме текущего restricted, и repeat выключен, не переключаемся
					if (!this.repeat) {
						return;
					}
					// При repeat можем перезапустить тот же трек
					newIndex = currentIndex;
				} else {
					const randomIndex = Math.floor(Math.random() * otherIndices.length);
					const selectedIndex = otherIndices[randomIndex];
					if (selectedIndex !== undefined) {
						newIndex = selectedIndex;
					} else {
						newIndex = currentIndex;
					}
				}
			} else if (this.repeat) {
				// При repeat переходим на следующий доступный трек по кругу
				const currentIndexInAvailable = availableIndices.indexOf(currentIndex);
				if (currentIndexInAvailable >= 0) {
					const nextIndexInAvailable = (currentIndexInAvailable + 1) % availableIndices.length;
					const selectedIndex = availableIndices[nextIndexInAvailable];
					if (selectedIndex !== undefined) {
						newIndex = selectedIndex;
					} else {
						newIndex = currentIndex;
					}
				} else {
					// Текущий индекс не в списке доступных (не должно быть), используем первый доступный
					newIndex = availableIndices[0] ?? currentIndex;
				}
			} else {
				// Обычный режим: ищем следующий доступный трек после текущего
				const nextAvailable = availableIndices.find((idx: number) => idx > currentIndex);
				
				if (nextAvailable === undefined) {
					// Нет следующего доступного трека
					return;
				}
				
				newIndex = nextAvailable;
			}

			// Устанавливаем новый индекс
			this.currentIndex = newIndex;
		},

		async previous(): Promise<void> {
			if (this.playingSongs.length === 0) {
				return;
			}
			
			let newIndex: number;
			
			if (this.repeat) {
				newIndex = this.currentIndex <= 0
					? this.playingSongs.length - 1
					: this.currentIndex - 1;
			} else if (this.shuffle) {
				// При shuffle выбираем случайный трек, но не тот же самый
				do {
					newIndex = Math.floor(Math.random() * this.playingSongs.length);
				} while (newIndex === this.currentIndex && this.playingSongs.length > 1);
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
			const currentSong = this.currentSong;
			const shuffled = [...this.playingSongs];

			for (let i = shuffled.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				const itemI = shuffled[i];
				const itemJ = shuffled[j];
				
				if (itemI && itemJ) {
					shuffled[i] = itemJ;
					shuffled[j] = itemI;
				}
			}

			this.playingSongs = shuffled;

			if (currentSong) {
				const newIndex = shuffled.findIndex(songItem => songItem.full_id === currentSong.full_id);
				if (newIndex >= 0) {
					this.currentIndex = newIndex;
				}
			}
		},

	toggleShuffle() {
		if (!this.shuffle) {
			// Включаем shuffle
			// Сохраняем оригинальный порядок, если еще не сохранен
			if (this.originalSongs.length === 0 && this.playingSongs.length > 0) {
				this.originalSongs = [...this.playingSongs];
			}
			// Перемешиваем треки
			this.shuffleSongs();
		} else {
			// Выключаем shuffle - восстанавливаем оригинальный порядок
			if (this.originalSongs.length > 0) {
				const currentSong = this.currentSong;
				this.playingSongs = [...this.originalSongs];
				
				// Обновляем currentIndex чтобы текущий трек остался активным
				if (currentSong) {
					const newIndex = this.playingSongs.findIndex(
						song => song.full_id === currentSong.full_id
					);
					if (newIndex >= 0) {
						this.currentIndex = newIndex;
					}
				}
				
				this.originalSongs = [];
			}
		}
		
		this.shuffle = !this.shuffle;
	},

		toggleRepeat() {
			this.repeat = !this.repeat;
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

		setPlaylistMore(more: TMore | null) {
			this.playlistMore = more;
		},

		async loadMoreTracks(): Promise<TAudio[] | null> {
			if (!this.playlistMore || !this.playing) {
				return null;
			}

			const more = this.playlistMore;
			if (!more.section_id || !more.next_from) {
				return null;
			}

			const result = await $fetch<{ audios: TAudio[]; more: TMore }>(
				`/api/vk/audio/${this.playing.owner_id}/${this.playing.playlist_id}`,
				{
					params: {
						section_id: more.section_id,
						next_from: more.next_from
					}
				}
			).catch((error) => {
				console.error("Failed to load more tracks:", error);
				return null;
			});

			if (!result || !result.audios) {
				return null;
			}

			if (result.audios.length > 0) {
				// Фильтруем restricted треки при подгрузке
				const filteredAudios = result.audios.filter((audio: TAudio) => !audio.is_restriction);
				this.playingSongs.push(...filteredAudios);
				
				if (this.playing) {
					this.playing.list = [...this.playingSongs];
				}
			}

			if (result.more && result.more.section_id && result.more.next_from) {
				this.playlistMore = result.more;
			} else {
				this.playlistMore = null;
			}

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
		}
	}
});

