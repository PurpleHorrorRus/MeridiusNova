import type { TAudio } from "~~/server/utils/types";
import type { TParsedPayload } from "~~/server/api/vk/audio/types";
import type { TPlaylist } from "~~/server/utils/types";
import { usePlaylist } from "~/composables/usePlaylist";
import { usePlaylistStore } from "~/stores/playlist";
import { usePlayerStore } from "~/stores/player";
import { useSongsContext } from "~/composables/useSongsContext";
import { useSearch } from "~/composables/useSearch";
import { useVkStore } from "~/stores/vk";
import { inject, triggerRef } from "vue";
import type { Ref, ComputedRef } from "vue";

export const useUpdateTrack = () => {
	const { current, playing } = usePlaylist();
	const playlistStore = usePlaylistStore();
	const playerStore = usePlayerStore();
	const songsContext = useSongsContext();
	
	// Получаем данные через inject (должно быть на верхнем уровне setup)
	const collectionData = inject<Ref<TParsedPayload | null> | undefined>("collectionData", undefined);
	const playlistData = inject<Ref<TParsedPayload | null> | undefined>("playlistData", undefined);
	const playlistInfo = inject<Ref<TPlaylist | null> | undefined>("playlistInfo", undefined);
	const playlistAudiosComputed = inject<ComputedRef<TAudio[]> | undefined>("playlistAudiosComputed", undefined);

	const updateTrackInAllPlaces = (trackId: number, updater: (track: TAudio) => TAudio | null, shouldRemoveFromList = false) => {
		// Ищем по id (он не меняется)
		const searchFn = (s: TAudio) => s.id === trackId;

		// Обновляем в songsContext
		if (songsContext?.value) {
			const index = songsContext.value.findIndex(searchFn);
			if (index >= 0) {
				const track = songsContext.value[index];
				if (track) {
					const updated = updater(track);
					
					// Обновляем в исходных данных (если songsContext - это computed)
					const route = useRoute();
					
					// Обновляем в результатах поиска
					// Удаляем из исходных данных ТОЛЬКО если shouldRemoveFromList === true
					// Иначе только обновляем (не удаляем)
					if (route.path.startsWith('/search')) {
						const { results } = useSearch();
						if (results?.value) {
							// Обновляем в categories
							if (results.value.categories) {
								for (const category of results.value.categories) {
									if (category.audios) {
										const audioIndex = category.audios.findIndex(searchFn);
										if (audioIndex >= 0) {
											if (updated === null && shouldRemoveFromList) {
												// Удаляем только если shouldRemoveFromList === true
												category.audios.splice(audioIndex, 1);
											} else if (updated !== null) {
												// Обновляем если это не удаление
												category.audios[audioIndex] = updated;
											}
											break;
										}
									}
								}
							}
							// Обновляем в audios (обратная совместимость)
							if (results.value.audios) {
								const audioIndex = results.value.audios.findIndex(searchFn);
								if (audioIndex >= 0) {
									if (updated === null && shouldRemoveFromList) {
										// Удаляем только если shouldRemoveFromList === true
										results.value.audios.splice(audioIndex, 1);
									} else if (updated !== null) {
										// Обновляем если это не удаление
										results.value.audios[audioIndex] = updated;
									}
								}
							}
						}
					}
					
					// Флаг, указывающий, обновили ли мы данные напрямую
					let updatedDirectly = false;
					
					// Обновляем в данных библиотеки
					// Библиотека может отображаться на:
					// 1. /collection - использует useFetch для /api/vk/audio/${user_id}/-1
					// 2. /playlist/${user_id}/-1 - использует useFetch для /api/vk/audio/${user_id}/-1
					// Получаем прямой доступ к data через provide/inject (inject вызван на верхнем уровне composable)
					if (route.path.startsWith('/collection') || route.path.match(/\/playlist\/\d+\/-1$/)) {
						const injectedData = route.path.startsWith('/collection') ? collectionData : playlistData;
						
					// Обновляем в data.value.audios
					if (injectedData?.value?.audios) {
						const audioIndex = injectedData.value.audios.findIndex(searchFn);
						if (audioIndex >= 0) {
							if (updated === null && shouldRemoveFromList) {
								// Удаляем: используем splice и triggerRef для реактивности
								injectedData.value.audios.splice(audioIndex, 1);
								// Триггерим реактивность вручную, так как useFetch может не отследить splice
								triggerRef(injectedData as Ref);
								// Также триггерим computed property audios, если он доступен
								if (playlistAudiosComputed) {
									triggerRef(playlistAudiosComputed as any);
								}
								updatedDirectly = true;
							} else if (updated !== null) {
								// Обновляем если это не удаление
								injectedData.value.audios[audioIndex] = updated;
								updatedDirectly = true;
							}
						}
					}
						
						// ВАЖНО: также обновляем playlistInfo.list (если оно есть)
						// На странице /playlist/:owner_id/:playlist_id computed возвращает СНАЧАЛА playlistInfo.list, если он есть
						if (playlistInfo?.value?.list && Array.isArray(playlistInfo.value.list)) {
							const listIndex = playlistInfo.value.list.findIndex(searchFn);
							
							if (listIndex >= 0) {
								if (updated === null && shouldRemoveFromList) {
									// Удаляем
									playlistInfo.value.list.splice(listIndex, 1);
								} else if (updated !== null) {
									// Обновляем
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
		if (current.value?.list) {
			const index = current.value.list.findIndex(searchFn);
			if (index >= 0) {
				const track = current.value.list[index];
				if (track) {
					const updated = updater(track);
					if (updated === null) {
						current.value.list.splice(index, 1);
					} else {
						current.value.list[index] = updated;
					}
				}
			}
		}

		// Обновляем в playing плейлисте
		if (playing.value?.list) {
			const index = playing.value.list.findIndex(searchFn);
			if (index >= 0) {
				const track = playing.value.list[index];
				if (track) {
					const updated = updater(track);
					if (updated === null) {
						playing.value.list.splice(index, 1);
					} else {
						playing.value.list[index] = updated;
					}
				}
			}
		}

		// Обновляем в очереди воспроизведения
		const queueIndex = playlistStore.playingSongs.findIndex(searchFn);
		if (queueIndex >= 0) {
			const track = playlistStore.playingSongs[queueIndex];
			if (track) {
				const updated = updater(track);
				if (updated === null) {
					playlistStore.playingSongs.splice(queueIndex, 1);
				} else {
					playlistStore.playingSongs[queueIndex] = updated;
				}
			}
		}

		// Обновляем в playerStore
		if (playerStore.song && searchFn(playerStore.song)) {
			const updated = updater(playerStore.song);
			if (updated !== null) {
				playerStore.song = updated;
			}
		}
	};

	return {
		updateTrackInAllPlaces
	};
};

