<template>
	<div class="playlist-page">
		<div v-if="pending && !data && !error" class="loading">
			<LoadingSpinner />
		</div>

		<div v-else-if="error && !data" class="error">
			{{ error }}
		</div>

		<div v-else class="playlist-content" ref="contentRef">
			<div class="playlist-tracks">
				<div v-if="isRestricted" class="playlist-restricted-message">
					<Icon name="mdi:lock" size="20" />
					<span>{{ getString("library.hidden") }}</span>
				</div>

				<template v-else>
					<div class="playlist-tracks-header">
						<span class="tracks-header-title">{{ getString("playlist.tracksHeader.title") }}</span>
						<span class="tracks-header-album">{{ getString("playlist.tracksHeader.album") }}</span>
						<span class="tracks-header-duration">
							<Icon name="mdi:clock-outline" size="16" />
						</span>
					</div>

					<Song
						v-for="(audio, index) in audios"
						:key="`${audio.owner_id}-${audio.id}-${index}`"
						:audio="audio"
						:index="index"
					/>

					<div v-show="hasMore" class="load-more" ref="loadMoreRef">
						<LoadingSpinner v-if="isLoadingMore" />
					</div>
				</template>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { TParsedPayload } from "~~/server/api/vk/audio/types";
import { type TPlaylist, type TMore } from "~~/server/utils/types";
import { provideSongsContext } from "~/composables/useSongsContext";
import { authenticatedFetch } from "~/utils/api";

const { getString } = useStrings();
const route = useRoute();
const ownerId = computed(() => Number(route.params.owner_id));
const playlistId = computed(() => Number(route.params.playlist_id));
const isCollection = computed(() => playlistId.value === -1);

// Получаем данные плейлиста из родительского компонента
const playlistData = inject<Ref<TPlaylist | null>>("playlistInfo", ref(null));

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

const { data, pending, error, refresh } = useFetch<TParsedPayload>(
	audioUrl,
	{
		immediate: false,
		lazy: true,
		cache: "no-store",
		$fetch: authenticatedFetch
	}
);

// Запускаем загрузку только для коллекций
watch(audioUrl, (url) => {
	if (url && isCollection.value) {
		refresh();
	}
}, { immediate: true });


const audios = computed(() => {
	// Для обычных плейлистов используем треки из playlist.list (которые приходят из /api/vk/playlists с list=true)
	if (!isCollection.value && playlistData.value && playlistData.value.list && Array.isArray(playlistData.value.list)) {
		return playlistData.value.list;
	}

	// Для коллекций используем треки из audio endpoint
	if (isCollection.value && data.value) {
		const payload = data.value as TParsedPayload;
		if (payload.audios) {
			return payload.audios;
		}
	}

	return [];
});

// Обновляем restricted в playlistData для коллекций на основе ответа API
watch([data, pending, error], ([newData, isPending, hasError]) => {
	if (!isCollection.value || !playlistData.value) {
		return;
	}

	// Если загрузка завершена
	if (!isPending) {
		// Если есть ошибка, считаем что музыка скрыта
		if (hasError) {
			playlistData.value.restricted = true;
		} else if (!newData || !newData.audios || newData.audios.length === 0) {
			// Если треков нет, устанавливаем restricted = true
			playlistData.value.restricted = true;
		} else {
			// Если есть треки, устанавливаем restricted = false
			playlistData.value.restricted = false;
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
	// Для обычных плейлистов проверяем more из playlistData
	if (!isCollection.value && playlistData.value?.more) {
		return Boolean(playlistData.value.more.section_id && playlistData.value.more.next_from);
	}

	// Для коллекций проверяем more из data
	if (isCollection.value && data.value) {
		const payload = data.value as TParsedPayload;
		if (payload.more) {
			return Boolean(payload.more.section_id && payload.more.next_from);
		}
	}

	return false;
});

const loadMoreRef = ref<HTMLElement | null>(null);
const isLoadingMore = ref(false);

const loadMore = async () => {
	// Double check hasMore before loading
	if (!hasMore.value || pending.value || isLoadingMore.value) {
		return;
	}

	let more: TMore | null = null;

	// Для обычных плейлистов используем more из playlistData
	if (!isCollection.value) {
		if (!playlistData.value?.more) {
			return;
		}
		more = playlistData.value.more;
	} else {
		// Для коллекций используем more из data
		if (!data.value) {
			return;
		}
		const payload = data.value as TParsedPayload;
		if (!payload.more) {
			return;
		}
		more = payload.more;
	}

	// Verify more parameters are not empty
	if (!more.section_id || !more.next_from) {
		return;
	}

	isLoadingMore.value = true;

	const result = await authenticatedFetch<TParsedPayload>(`/api/vk/audio/${ownerId.value}/${playlistId.value}`, {
		params: {
			section_id: more.section_id,
			next_from: more.next_from
		}
	}).catch(() => {
		return null;
	});

	if (result) {
		if (isCollection.value && data.value) {
			// Для коллекций обновляем data.value
			const payload = data.value as TParsedPayload;
			if (result.audios && result.audios.length > 0) {
				// Directly push to array to ensure reactivity
				if (!payload.audios) {
					payload.audios = [];
				}
				payload.audios.push(...result.audios);
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
			// Для обычных плейлистов обновляем playlistData.value.list
			if (result.audios && result.audios.length > 0) {
				if (!playlistData.value.list) {
					playlistData.value.list = [];
				}
				playlistData.value.list.push(...result.audios);
			}

			// Always update more, even if empty (to stop loading)
			if (result.more) {
				playlistData.value.more = result.more;
			} else {
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

useScrollLoad(() => {
	if (!hasMore.value) {
		return;
	}

	if (isLoadingMore.value) {
		return;
	}

	loadMore();
}, {
	threshold: 200,
	enabled: computed(() => {
		// Всегда включаем observer, проверку делаем внутри
		return !isLoadingMore.value;
	})
});


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

	@media (max-width: 768px) {
		padding: 0 16px 16px;
	}

	@media (max-width: 480px) {
		padding: 0 12px 12px;
	}
}

.playlist-tracks-header {
	display: grid;
	grid-template-columns: 1fr 1fr 80px;
	gap: 16px;
	padding: 8px 16px;
	border-bottom: 1px solid var(--border, #282828);
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
