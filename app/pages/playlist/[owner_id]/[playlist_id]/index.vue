<template>
	<div class="playlist-page">
		<div v-if="pending && !data && !error" class="loading">
			<LoadingSpinner />
		</div>

		<div v-else-if="error && !data" class="error" v-text="error" />

		<div v-else class="playlist-content" ref="contentRef">
			<div class="playlist-tracks">
				<div v-if="isRestricted" class="playlist-restricted-message">
					<Icon name="mdi:lock" size="20" />
					<span v-text="getString('library.hidden')" />
				</div>

				<template v-else>
					<div class="playlist-tracks-header">
						<span class="tracks-header-title" v-text="getString('playlist.tracksHeader.title')" />
						<span class="tracks-header-album" v-text="getString('playlist.tracksHeader.album')" />
						<span class="tracks-header-duration">
							<Icon name="mdi:clock-outline" size="16" />
						</span>
					</div>

					<SongList
						:songs="audios"
						:table-mode="true"
						:virtualized="true"
						:item-height="56"
						:overscan="14"
						:has-more="hasMore"
						:is-loading-more="isLoadingMore"
						:load-more="loadMore"
						:sortable="canEdit"
						@sorted="handleReorderSongs"
						ref="virtualListRef"
						class="playlist-virtual-list"
					>
						<template #item="{ items: visibleItems, startIndex, handleClick, handleAlbumClick, handleArtistClick, handleAction, handleLongPress, handleMouseDown, draggedIndex, draggedOverIndex, shouldShiftUp, shouldShiftDown }">
							<VirtualSongItem
								v-for="(audio, relativeIndex) in visibleItems"
								:key="`${audio.owner_id}-${audio.id}-${startIndex + relativeIndex}`"
								:index="startIndex + relativeIndex"
								@height="(height: number) => virtualListRef?.updateItemHeight(startIndex + relativeIndex, height)"
							>
								<div
									class="song-wrapper"
									:class="{
										'dragging': draggedIndex === startIndex + relativeIndex,
										'drag-shift-up': shouldShiftUp(startIndex + relativeIndex),
										'drag-shift-down': shouldShiftDown(startIndex + relativeIndex)
									}"
								>
									<div
										class="song-drag-handle"
										:class="{ 'draggable': handleMouseDown }"
										@mousedown="handleMouseDown ? (e: MouseEvent) => handleMouseDown(e, startIndex + relativeIndex) : undefined"
									>
										<LazySong
											:audio="audio"
											:index="startIndex + relativeIndex"
											@click="handleClick(audio)"
											@album-click="handleAlbumClick"
											@artist-click="handleArtistClick"
											@action="handleAction"
											@long-press="handleLongPress(audio)"
										/>
									</div>
								</div>
							</VirtualSongItem>
						</template>
					</SongList>
				</template>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import type { TParsedPayload } from "~~/server/api/vk/audio/types";
import { type TPlaylist, type TMore, type TAudio } from "~~/server/utils/types";
import { provideSongsContext } from "~/composables/useSongsContext";
import { authenticatedFetch } from "~/utils/api";
import { usePlaylistStore } from "~/stores/playlist";
import { useVkStore } from "~/stores/vk";
import { useAudioStore } from "~/stores/audio";
import SongList from "~/components/SongList.vue";
const LazySong = defineAsyncComponent(() => import("~/components/Song/Song.vue"));
import VirtualSongItem from "~/components/VirtualSongItem.vue";

const { getString } = useStrings();
const route = useRoute();
const vkStore = useVkStore();
const ownerId = computed(() => Number(route.params.owner_id));
const playlistId = computed(() => Number(route.params.playlist_id));
const accessHash = computed(() => route.query.access_hash as string | undefined);
const isCollection = computed(() => playlistId.value === -1);
const playlistStore = usePlaylistStore();

// Получаем данные плейлиста из родительского компонента
const playlistData = inject<Ref<TPlaylist | null>>("playlistInfo", ref(null));

const canEdit = computed(() => {
	if (!playlistData.value) {
		return false;
	}
	return playlistData.value.owner_id === vkStore.user_id;
});

const isRestricted = computed(() => {
	// Проверяем restricted только для коллекций (playlist_id === -1)
	if (playlistId.value !== -1) {
		return false;
	}
	
	// Проверяем только после загрузки данных
	if (pending.value) {
		return false;
	}
	
	// Если есть треки, музыка не скрыта
	if (audios.value && audios.value.length > 0) {
		return false;
	}
	
	// Для коллекций проверяем флаг restricted из плейлиста или отсутствие данных
	const playlist = playlistData.value;
	if (!playlist) {
		return false;
	}
	
	// Если есть ошибка и нет данных, считаем что музыка скрыта
	if (error.value && !data.value) {
		return true;
	}
	
	// Возвращаем true если явно установлен флаг restricted И нет треков
	return playlist.restricted === true;
});

// Для коллекций загружаем треки через /api/vk/audio
// Для обычных плейлистов используем треки из playlistData.list (которые приходят из /api/vk/playlists с list=true)
const audioUrl = computed(() => {
	if (isCollection.value) {
		return `/api/vk/audio/${ownerId.value}/${playlistId.value}`;
	}
	return "";
});

const audioKey = computed(() => `audio-${ownerId.value}-${playlistId.value}`);
const { data, pending, error, refresh } = useAsyncData<TParsedPayload>(
	audioKey,
	() => authenticatedFetch<TParsedPayload>(audioUrl.value),
	{
		immediate: false,
		lazy: true,
		getCachedData: (key) => {
			const cached = useNuxtApp().payload.data[key];
			if (cached && Date.now() - (cached._timestamp || 0) < 30000) {
				return cached;
			}
			return undefined;
		},
		transform: (data) => {
			if (data) {
				(data as any)._timestamp = Date.now();
			}
			return data;
		}
	}
);

// Запускаем загрузку только для коллекций
watch([audioUrl, isCollection], ([url, isCollectionValue]) => {
	if (url && isCollectionValue) {
		refresh();
	}
}, { immediate: true });


const audios = ref<TAudio[]>([]);

watch([playlistData, data, isCollection], () => {
	// Для обычных плейлистов используем треки из playlist.list (которые приходят из /api/vk/playlists с list=true)
	if (!isCollection.value && playlistData.value?.list && Array.isArray(playlistData.value.list)) {
		audios.value = playlistData.value.list;
		return;
	}

	// Для коллекций используем треки из audio endpoint
	if (isCollection.value && data.value) {
		const payload = data.value as unknown as TParsedPayload;
		if (payload?.audios) {
			audios.value = payload.audios;
			return;
		}
	}

	audios.value = [];
}, { immediate: true, flush: "post" });

// Синхронизируем изменения обратно в playlistData для обычных плейлистов
// Используем прямое присваивание для лучшей производительности
watch(audios, (newAudios) => {
	if (!isCollection.value && playlistData.value) {
		playlistData.value.list = newAudios;
	}
}, { flush: "post" });

// Обновляем restricted в playlistData для коллекций на основе ответа API
watch([data, pending, error, isCollection], ([newData, isPending, hasError, isCollectionValue]) => {
	if (!isCollectionValue || !playlistData.value) {
		return;
	}

	if (!isPending) {
		if (hasError) {
			playlistData.value.restricted = true;
		} else {
			const payload = newData as unknown as TParsedPayload;
			playlistData.value.restricted = !payload || !payload.audios || payload.audios.length === 0;
		}
	}
}, { immediate: true });

// Предоставляем контекст треков для компонентов Song (передаем computed для реактивности)
provideSongsContext(audios);

// Предоставляем доступ к data для обновлений
// ВАЖНО: предоставляем сам массив audios как computed, а не data
provide("playlistAudiosComputed", audios);
provide("playlistData", data);

const hasMore = computed(() => {
	// Для обычных плейлистов проверяем, есть ли еще треки для загрузки
	if (!isCollection.value && playlistData.value) {
		const loadedCount = playlistData.value.list?.length || 0;
		const totalCount = playlistData.value.size || 0;
		// Если загружено меньше, чем всего треков, значит есть еще
		if (totalCount > 0 && loadedCount < totalCount) {
			return true;
		}
		// Если totalCount неизвестен, проверяем more (для обратной совместимости)
		if (totalCount === 0 && playlistData.value.more) {
			return Boolean(playlistData.value.more.section_id && playlistData.value.more.next_from);
		}
		return false;
	}

	// Для коллекций проверяем more из data
	if (isCollection.value && data.value) {
		const payload = data.value as unknown as TParsedPayload;
		if (payload?.more) {
			return Boolean(payload.more.section_id && payload.more.next_from);
		}
	}

	return false;
});

const virtualListRef = ref<InstanceType<typeof SongList> | null>(null);
const isLoadingMore = ref(false);

const loadMore = async () => {
	// Double check hasMore before loading
	if (!hasMore.value || pending.value || isLoadingMore.value) {
		return;
	}

	let more: TMore | null = null;

	// Для обычных плейлистов используем offset и count (не more)
	if (!isCollection.value) {
		if (!playlistData.value) {
			return;
		}
		// Для обычных плейлистов не используем more, а используем offset
		// Продолжаем выполнение без проверки more
	} else {
		// Для коллекций используем more из data
		if (!data.value) {
			return;
		}
		const payload = data.value as unknown as TParsedPayload;
		if (!payload?.more) {
			return;
		}
		more = payload.more;
		// Verify more parameters are not empty
		if (!more.section_id || !more.next_from) {
			return;
		}
	}

	isLoadingMore.value = true;

	const result = await authenticatedFetch<TParsedPayload>(`/api/vk/audio/${ownerId.value}/${playlistId.value}`, {
		params: {
			section_id: more?.section_id,
			next_from: more?.next_from
		}
	}).catch(() => (null));

	if (result) {
		if (isCollection.value && data.value) {
			// Для коллекций обновляем data.value
			const payload = data.value as unknown as TParsedPayload;

			if (result.audios && result.audios.length > 0) {
				// Directly push to array to ensure reactivity
				if (!payload.audios) {
					payload.audios = [];
				}

				payload.audios.push(...result.audios);
				audios.value.push(...result.audios);
			}

			// Always update more, even if empty (to stop loading)
			if (result.more) {
				payload.more = result.more;
			} else {
				payload.more = {
					section_id: "",
					next_from: "",
					start_from: ""
				};
			}
		} else if (!isCollection.value && playlistData.value) {
			// Для обычных плейлистов загружаем через /api/vk/playlists с offset
			const currentOffset = playlistData.value.list?.length || 0;

			const playlistResult = await authenticatedFetch<TPlaylist>(`/api/vk/playlists/${ownerId.value}/${playlistId.value}`, {
				params: {
					list: "true",
					access_hash: playlistData.value.access_hash || accessHash.value,
					count: "50",
					offset: String(currentOffset)
				}
			}).catch(() => (null));

			if (playlistResult && playlistResult.list && playlistResult.list.length > 0) {
				if (!playlistData.value.list) {
					playlistData.value.list = [];
				}

				playlistData.value.list.push(...playlistResult.list);
				audios.value.push(...playlistResult.list);

				// Обновляем size, если он изменился
				if (playlistResult.size !== undefined) {
					playlistData.value.size = playlistResult.size;
				}

				// Обновляем more из результата (для обратной совместимости)
				if (playlistResult.more) {
					playlistData.value.more = playlistResult.more;
				} else {
					playlistData.value.more = {
						section_id: "",
						next_from: "",
						start_from: ""
					};
				}
			} else {
				// Если больше нет треков, сбрасываем more
				playlistData.value.more = {
					section_id: "",
					next_from: "",
					start_from: ""
				};
			}
		}
	}

	isLoadingMore.value = false;
};

// loadMore теперь обрабатывается внутри VirtualSongList через IntersectionObserver

const handleReorderSongs = async (newOrder: TAudio[], originalOrder?: TAudio[], fromIndex?: number, toIndex?: number) => {
	if (!canEdit.value) {
		return;
	}

	if (isCollection.value) {
		// Для коллекций используем reorderAudio с audio_id и next_audio_id
		// API перемещает трек audio_id перед треком next_audio_id (или в конец, если next_audio_id = 0)
		const original = originalOrder || [...audios.value];
		
		// Если у нас есть fromIndex и toIndex, используем их для точного определения перемещенного элемента
		if (fromIndex !== undefined && toIndex !== undefined && fromIndex !== toIndex) {
			const movedAudio = original[fromIndex];
			if (!movedAudio) {
				return;
			}

			// Определяем next_audio_id - это id трека, ПЕРЕД которым нужно вставить перемещаемый трек
			// VK API: next_audio_id = 0 означает переместить в начало (первое место)
			// next_audio_id = <id> означает переместить ПЕРЕД треком с этим id
			// Если перемещаем на позицию toIndex, используем id трека, который будет на позиции toIndex - 1 в новом порядке
			let nextAudioId = 0;
			if (toIndex === 0) {
				// Перемещаем на первое место - используем 0
				nextAudioId = 0;
			} else if (toIndex > 0) {
				// Перемещаем на позицию toIndex
				// В новом порядке на позиции toIndex находится перемещенный элемент
				// Трек, который будет ПЕРЕД ним (на позиции toIndex - 1 в новом порядке):
				// Вычисляем, какой трек будет на позиции toIndex - 1 в новом порядке
				let targetIndexInOriginal: number;
				if (fromIndex > toIndex) {
					// Перемещаем вверх: трек на позиции toIndex - 1 в новом порядке
					// это трек, который был на позиции toIndex - 1 в исходном порядке
					targetIndexInOriginal = toIndex - 1;
				} else {
					// Перемещаем вниз: трек на позиции toIndex - 1 в новом порядке
					// это трек, который был на позиции toIndex в исходном порядке
					targetIndexInOriginal = toIndex;
				}
				
				const targetAudio = original[targetIndexInOriginal];
				if (targetAudio && targetAudio.id !== movedAudio.id) {
					nextAudioId = targetAudio.id;
				} else if (targetIndexInOriginal > 0) {
					// Если трек на вычисленной позиции - это сам перемещаемый элемент, берем предыдущий
					const prevAudio = original[targetIndexInOriginal - 1];
					if (prevAudio && prevAudio.id !== movedAudio.id) {
						nextAudioId = prevAudio.id;
					}
				}
			}

			try {
				const audioStore = useAudioStore();
				await audioStore.reorderAudio({
					audio_id: movedAudio.id,
					next_audio_id: nextAudioId,
					owner_id: ownerId.value
				});
			} catch (error) {
				// В случае ошибки возвращаем исходный порядок
				audios.value = original;
			}
		} else {
			// Fallback: если fromIndex/toIndex не переданы, используем старую логику
			let hasError = false;

			// Находим элементы, которые изменили свою позицию
			const movedItems: Array<{ audio: TAudio; newIndex: number; originalIndex: number }> = [];
			
			for (let i = 0; i < newOrder.length; i++) {
				const currentAudio = newOrder[i];
				if (!currentAudio) {
					continue;
				}

				const originalIndex = original.findIndex(a => a.full_id === currentAudio.full_id);
				
				// Если трек уже на правильной позиции, пропускаем
				if (originalIndex === i) {
					continue;
				}

				// Сохраняем информацию о перемещенном элементе
				movedItems.push({ audio: currentAudio, newIndex: i, originalIndex });
			}

			// Если нет перемещенных элементов, выходим
			if (movedItems.length === 0) {
				return;
			}

			// Для коллекций VK API нам нужно перемещать элементы в правильном порядке
			// Перемещаем элементы, начиная с тех, которые находятся ближе к концу нового порядка
			movedItems.sort((a, b) => b.newIndex - a.newIndex);

			// Выполняем перемещения последовательно
			for (const moved of movedItems) {
				// Определяем next_audio_id - это id следующего трека в новом порядке
				const nextAudio = moved.newIndex < newOrder.length - 1 ? newOrder[moved.newIndex + 1] : null;
				const nextAudioId = nextAudio ? nextAudio.id : 0;

				try {
					const audioStoreReorder = useAudioStore();
					await audioStoreReorder.reorderAudio({
						audio_id: moved.audio.id,
						next_audio_id: nextAudioId,
						owner_id: ownerId.value
					});
				} catch (error) {
					hasError = true;
					break;
				}
			}

			if (hasError) {
				// В случае ошибки возвращаем исходный порядок
				audios.value = original;
			}
		}
	} else {
		// Для обычных плейлистов используем reorderSongsInPlaylist с массивом full_id
		// Каждый full_id должен заканчиваться подчеркиванием
		if (!playlistData.value) {
			return;
		}

		const audioIdsParts: string[] = [];
		for (let i = 0; i < newOrder.length; i++) {
			const audioItem = newOrder[i];
			if (audioItem) {
				audioIdsParts.push(`${audioItem.full_id}_`);
			}
		}
		const audioIds = audioIdsParts.join(",");

		await playlistStore.reorderSongsInPlaylist({
			playlist_id: playlistData.value.playlist_id,
			Audios: audioIds
		}).catch((error) => {
			// В случае ошибки возвращаем исходный порядок
			if (playlistData.value && playlistData.value.list) {
				audios.value = [...playlistData.value.list];
			}
		});
	}
};



</script>

<style scoped lang="scss">
.playlist-page {
	display: flex;
	flex-direction: column;
	min-height: 100%;
}

.playlist-content {
	display: flex;
	flex-direction: column;
}

.playlist-tracks {
	display: flex;
	flex-direction: column;
	padding: 0 32px 32px;
	flex: 1;
	min-height: 0;

	@media (max-width: 768px) {
		padding: 0 16px 16px;
	}

	@media (max-width: 480px) {
		padding: 0 12px 12px;
	}
}

.playlist-virtual-list {
	flex: 1;
	min-height: 0;
}

.playlist-tracks-header {
	display: grid;
	grid-template-columns: 1fr 1fr 80px;
	gap: 16px;
	padding: 8px 16px;
	color: var(--text-secondary, #b3b3b3);
	font-size: 12px;
	font-weight: 500;
	text-transform: uppercase;
	letter-spacing: 1px;
	position: sticky;
	top: 0;
	background: var(--bg-primary, #121212);
	z-index: 10;
	align-items: center;

	@media (max-width: 768px) {
		gap: 12px;
		padding: 8px 12px;
		font-size: 11px;
	}

	@media (max-width: 480px) {
		grid-template-columns: 1fr 60px;
		gap: 8px;
		padding: 8px;
		font-size: 10px;

		.tracks-header-album {
			display: none;
		}
	}
}

.tracks-header-title {
	grid-column: 1;
}

.tracks-header-album {
	grid-column: 2;
}

.tracks-header-duration {
	grid-column: 3;
	text-align: center;
	display: flex;
	align-items: center;
	justify-content: center;

	@media (max-width: 480px) {
		grid-column: 2;
	}
}

.loading {
	padding: 32px;

	@media (max-width: 768px) {
		padding: 16px;
	}

	@media (max-width: 480px) {
		padding: 12px;
	}
}

.error {
	text-align: center;
	padding: 40px;

	@media (max-width: 768px) {
		padding: 20px;
	}

	@media (max-width: 480px) {
		padding: 16px;
	}
}

.load-more {
	text-align: center;
	padding: 20px;
	color: var(--text-secondary, #b3b3b3);
}

.song-wrapper {
	position: relative;
	transition: opacity 0.2s ease, transform 0.2s ease;
	-webkit-user-select: none;
	user-select: none;

	&.dragging {
		visibility: hidden;
	}

	&.drag-shift-up {
		transform: translateY(-56px);
	}

	&.drag-shift-down {
		transform: translateY(56px);
	}
}

.song-drag-handle {
	width: 100%;
	cursor: move;
	-webkit-user-select: none;
	user-select: none;
	touch-action: none;

	&.draggable {
		cursor: move;
		-webkit-touch-callout: none;
		-webkit-user-select: none;
		user-select: none;
	}

	.song {
		pointer-events: auto;
	}
}

:global(.drag-ghost) {
	background: var(--bg-secondary, #181818) !important;
	border-radius: 8px;
}

.playlist-restricted-message {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: center;
	gap: 8px;
	padding: 60px 32px;
	text-align: center;

	:deep(svg) {
		width: 20px;
		height: 20px;
		color: var(--text-secondary, #b3b3b3);
		opacity: 0.5;
	}

	span {
		font-size: 16px;
		font-weight: 400;
		color: var(--text-secondary, #b3b3b3);
		opacity: 0.7;
		line-height: 1.5;
	}

	@media (max-width: 768px) {
		padding: 48px 24px;
		gap: 8px;

		:deep(svg) {
			width: 18px;
			height: 18px;
		}

		span {
			font-size: 15px;
		}
	}

	@media (max-width: 480px) {
		padding: 40px 20px;
		gap: 6px;

		:deep(svg) {
			width: 16px;
			height: 16px;
		}

		span {
			font-size: 14px;
		}
	}
}


</style>
