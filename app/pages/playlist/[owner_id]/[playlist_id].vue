<template>
	<div class="playlist-page">
		<div v-if="pending && !data && !error" class="loading">
			<SkeletonPlaylist :show-header="isPlaylist" />
		</div>

		<div v-else-if="error && !data" class="error">
			{{ error }}
		</div>

		<div v-else class="playlist-content" ref="contentRef">
			<PlaylistHeader
				v-if="playlistInfo && isPlaylist"
				:playlist="playlistInfo"
				@play="handlePlay"
				@follow="handleFollow"
				ref="playlistHeaderRef"
			/>

			<!-- User Playlists (only for "my music" - playlist_id === -1 and owner_id === userId) -->
			<div v-if="!isPlaylist && showUserPlaylists && userPlaylists.length > 0" class="user-playlists-section">
				<div class="user-playlists-header">
					<h2 class="section-title">Моя музыка</h2>
					<button @click="togglePlaylistsExpanded" class="expand-toggle-button">
						<Icon :name="playlistsExpanded ? 'mdi:chevron-up' : 'mdi:chevron-down'" size="20" />
						<span>{{ playlistsExpanded ? 'Скрыть' : 'Показать все' }}</span>
					</button>
				</div>
				<div class="playlists-miniatures" :class="{ expanded: playlistsExpanded }">
					<PlaylistMiniature
						v-for="playlist in displayedPlaylists"
						:key="`user-playlist-${playlist.owner_id}-${playlist.playlist_id}`"
						:playlist="playlist"
					/>
				</div>
			</div>

			<div class="playlist-tracks">
			<div class="playlist-tracks-header">
				<span class="tracks-header-title">Название</span>
				<span class="tracks-header-album">Альбом</span>
				<span class="tracks-header-duration">
					<Icon name="mdi:clock-outline" size="16" />
				</span>
			</div>

			<Song
				v-for="(audio, index) in audios"
				:key="`${audio.owner_id}-${audio.id}-${index}`"
				:audio="audio"
			/>

				<div v-show="hasMore" class="load-more" ref="loadMoreRef">
					<LoadingSpinner v-if="isLoadingMore" />
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { useVkStore } from "~/stores/vk";
import type { TParsedPayload } from "~~/server/api/vk/audio/types";
import { type TPlaylist } from "~~/server/utils/types";
import { provideSongsContext } from "~/composables/useSongsContext";

const route = useRoute();
const vkStore = useVkStore();
const ownerId = computed(() => Number(route.params.owner_id));
const playlistId = computed(() => Number(route.params.playlist_id));
const isPlaylist = computed(() => playlistId.value !== -1);
const accessHash = computed(() => route.query.access_hash as string | undefined);

const userId = computed(() => vkStore.user_id || 0);
const showUserPlaylists = computed(() => playlistId.value === -1 && ownerId.value === userId.value);

// Load user playlists if this is "my music"
const { data: userPlaylistsData } = useFetch<{ count: number; playlists: TPlaylist[] }>(
	showUserPlaylists.value ? "/api/vk/playlists" : "",
	{
		params: {
			owner_id: userId.value
		}
	}
);

const userPlaylists = computed(() => {
	const playlists = userPlaylistsData.value?.playlists || [];
	// Only show playlists with playlist_id !== -1 (not "my music")
	return playlists.filter(p => p.playlist_id !== -1);
});

const playlistsExpanded = ref(false);
const displayedPlaylists = computed(() => {
	if (playlistsExpanded.value) {
		return userPlaylists.value;
	}
	return userPlaylists.value.slice(0, 5); // Показываем только первые 5
});

const togglePlaylistsExpanded = () => {
	playlistsExpanded.value = !playlistsExpanded.value;
};

const { playPlaylist } = usePlaylist();

// Load playlist info if it's a playlist (загружаем ПЕРВЫМ, чтобы иметь доступ к list)
const playlistData = ref<TPlaylist | null>(null);
const { setCurrent } = usePlaylist();

if (isPlaylist.value) {
	const { data: playlistInfoData } = useFetch<TPlaylist>(`/api/vk/playlists/${ownerId.value}/${playlistId.value}`, {
		query: {
			list: "true"
		}
	});
	
	watch(playlistInfoData, (newPlaylistData) => {
		playlistData.value = newPlaylistData || null;
		if (newPlaylistData) {
			setCurrent(newPlaylistData);
		}
	}, { immediate: true });
}

const { data, pending, error } = useFetch<TParsedPayload>(
	() => `/api/vk/audio/${ownerId.value}/${playlistId.value}`,
	{
		immediate: true,
		cache: "no-store"
	}
);

const audios = computed(() => {
	// Сначала проверяем треки из playlist.list (если они есть)
	if (playlistData.value && playlistData.value.list && Array.isArray(playlistData.value.list) && playlistData.value.list.length > 0) {
		return playlistData.value.list;
	}

	// Fallback: используем треки из audio endpoint
	if (data.value && data.value.audios) {
		return data.value.audios;
	}

	return [];
});

// Предоставляем контекст треков для компонентов Song (передаем computed для реактивности)
provideSongsContext(audios);

// Предоставляем доступ к data для обновлений
// ВАЖНО: предоставляем сам массив audios как computed, а не data
provide("playlistAudiosComputed", audios);
provide("playlistData", data);
// Также предоставляем playlistData для обновления list
provide("playlistInfo", playlistData);

const hasMore = computed(() => {
	if (!data.value || !data.value.more) {
		return false;
	}
	const more = data.value.more;
	return Boolean(more.section_id && more.next_from);
});

const loadMoreRef = ref<HTMLElement | null>(null);
const isLoadingMore = ref(false);
const playlistHeaderRef = ref<HTMLElement | null>(null);

const loadMore = async () => {
	// Double check hasMore before loading
	if (!hasMore.value || pending.value || isLoadingMore.value || !data.value || !data.value.more) {
		return;
	}

	// Verify more parameters are not empty
	const more = data.value.more;
	if (!more.section_id || !more.next_from) {
		return;
	}

	isLoadingMore.value = true;

	const result = await $fetch<TParsedPayload>(`/api/vk/audio/${ownerId.value}/${playlistId.value}`, {
		params: {
			section_id: more.section_id,
			next_from: more.next_from
		}
	}).catch(() => {
		return null;
	});

	if (result && data.value) {
		if (result.audios && result.audios.length > 0) {
			// Directly push to array to ensure reactivity
			data.value.audios.push(...result.audios);
		}
		
		// Always update more, even if empty (to stop loading)
		if (result.more) {
			data.value.more = result.more;
		} else {
			// If no more data, set empty more to stop loading
			data.value.more = {
				section_id: "",
				next_from: "",
				start_from: ""
			};
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


const playlistInfo = computed(() => playlistData.value);

const handlePlay = async (playlist: TPlaylist) => {
	await playPlaylist(playlist);
};

const handleFollow = async (playlist: TPlaylist) => {
	// TODO: Implement follow/unfollow API
	console.log("Toggle follow", playlist);
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

.user-playlists-section {
	padding: 24px 32px;
	display: flex;
	flex-direction: column;
	gap: 20px;
	margin-bottom: 24px;

	@media (max-width: 768px) {
		padding: 16px;
		gap: 16px;
		margin-bottom: 16px;
	}

	@media (max-width: 480px) {
		padding: 12px;
		gap: 12px;
		margin-bottom: 12px;
	}
}

.user-playlists-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16px;
	margin-bottom: 4px;
}

.expand-toggle-button {
	display: flex;
	align-items: center;
	gap: 8px;
	background: var(--bg-secondary, #181818);
	border: 1px solid var(--border, #282828);
	border-radius: 20px;
	padding: 8px 16px;
	color: var(--text-secondary, #b3b3b3);
	cursor: pointer;
	transition: all 0.2s ease;
	font-size: 13px;
	font-weight: 500;

	&:hover {
		background: var(--bg-hover, #2a2a2a);
		border-color: var(--border-secondary, #3a3a3a);
		color: var(--text, #fff);
		transform: translateY(-1px);
	}

	&:active {
		transform: translateY(0);
	}
}

.section-title {
	font-size: 28px;
	font-weight: 700;
	color: var(--text, #fff);
	margin: 0;
	letter-spacing: -0.5px;

	@media (max-width: 768px) {
		font-size: 24px;
	}

	@media (max-width: 480px) {
		font-size: 20px;
	}
}

.playlists-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
	gap: 24px;
}

.playlists-miniatures {
	display: flex;
	flex-direction: column;
	gap: 8px;
	max-height: 400px;
	overflow: hidden;
	transition: max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1);
	padding: 4px 0;

	&.expanded {
		max-height: none;
	}
}
</style>