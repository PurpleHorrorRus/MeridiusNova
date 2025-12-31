import type { TAudio } from "~~/server/api/vk/audio/types";
import type { TPlaylist, TMore } from "~~/server/utils/types";

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

			return state.currentIndex < state.playingSongs.length - 1;
		},

		hasPrevious: (state) => {
			// Если включен repeat, всегда есть предыдущий трек (даже если это последний)
			if (state.repeat) {
				return state.playingSongs.length > 0;
			}

			return state.currentIndex > 0;
		}
	},

	actions: {
		setCurrent(playlist: TPlaylist) {
			this.current = playlist;
			this.loaded = playlist.list || [];
		},

	setPlaying(playlist: TPlaylist) {
		this.playing = playlist;
		// Очищаем оригинальные треки при смене плейлиста
		this.originalSongs = [];
		// playingSongs обновляется через setSongs для гарантии правильного обновления очереди
	},

	setSongs(songs: TAudio[]) {
		console.log("[SET_SONGS] Called", {
			inputSongsCount: Array.isArray(songs) ? songs.length : 0,
			currentQueueLength: this.playingSongs.length,
			currentIndex: this.currentIndex
		});
		
		// Фильтруем restricted треки при добавлении в очередь
		const filteredSongs = Array.isArray(songs) 
			? songs.filter(song => !song.is_restriction)
			: [];
		
		console.log("[SET_SONGS] After filtering", {
			filteredSongsCount: filteredSongs.length
		});
		
		// Полностью заменяем массив для правильной реактивности
		// Создаем новый массив, чтобы гарантировать обновление реактивности
		this.playingSongs = [...filteredSongs];
		this.originalSongs = [];
		
		// Обновляем список треков в плейлисте для синхронизации
		if (this.playing) {
			this.playing.list = [...this.playingSongs];
		}
		// currentIndex сбрасываем только если он выходит за границы нового массива
		if (this.currentIndex >= this.playingSongs.length) {
			this.currentIndex = -1;
		}
		
		console.log("[SET_SONGS] After update", {
			newQueueLength: this.playingSongs.length,
			newIndex: this.currentIndex
		});
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
		const playingIndex = this.playingSongs.findIndex(song => song.full_id === fullId);
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
		const loadedIndex = this.loaded.findIndex(song => song.full_id === fullId);
		if (loadedIndex >= 0) {
			this.loaded.splice(loadedIndex, 1);

			// Обновляем список в current плейлисте
			if (this.current) {
				this.current.list = [...this.loaded];
			}
		}

		// Обновляем originalSongs если shuffle включен
		if (this.originalSongs.length > 0) {
			const originalIndex = this.originalSongs.findIndex(song => song.full_id === fullId);
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

			let newIndex: number;
			
			if (this.repeat) {
				newIndex = (this.currentIndex + 1) % this.playingSongs.length;
			} else if (this.currentIndex < this.playingSongs.length - 1) {
				newIndex = this.currentIndex + 1;
			} else if (this.shuffle) {
				newIndex = Math.floor(Math.random() * this.playingSongs.length);
			} else {
				return;
			}

			// Пропускаем restricted треки
			let attempts = 0;
			while (attempts < this.playingSongs.length && this.playingSongs[newIndex]?.is_restriction) {
				if (this.repeat) {
					newIndex = (newIndex + 1) % this.playingSongs.length;
				} else if (newIndex < this.playingSongs.length - 1) {
					newIndex++;
				} else {
					// Если дошли до конца и все restricted, начинаем с начала
					newIndex = 0;
				}
				attempts++;
			}

			// Если нашли не-restricted трек, переключаемся на него
			if (!this.playingSongs[newIndex]?.is_restriction) {
				this.currentIndex = newIndex;
			}
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
				const newIndex = shuffled.findIndex(song => song.full_id === currentSong.full_id);
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

