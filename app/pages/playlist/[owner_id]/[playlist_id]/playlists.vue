<template>
	<div class="playlists-tab">
		<div v-if="pending && !data" class="loading">
			<LoadingSpinner />
		</div>

		<div v-else-if="error && !data" class="error" v-text="error" />

		<div v-else-if="data" class="playlists-content">
			<div v-if="playlists.length === 0" class="empty-state">
				<p>Плейлисты не найдены</p>
			</div>

			<div v-else class="playlists-grid">
				<LazyPlaylistCard
					v-for="playlist in playlists"
					:key="playlist.raw_id"
					v-memo="[playlist.raw_id, playlist.owner_id, playlist.playlist_id]"
					hydrate-on-visible
					:playlist="playlist"
					:show-play-button="true"
				/>
			</div>

			<div v-if="hasMore" class="load-more" ref="loadMoreRef">
				<LoadingSpinner v-if="isLoadingMore" />
				<button v-else @click="loadMore" :disabled="isLoadingMore">
					Загрузить еще
				</button>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import { useVkStore } from "~/stores/vk";
import type { TPlaylist } from "~~/server/utils/types";
import { useIntersectionObserver } from "~/composables/useIntersectionObserver";

const LazyPlaylistCard = defineAsyncComponent(() => import("~/components/PlaylistCard.vue"));

const route = useRoute();
const vkStore = useVkStore();

const ownerId = computed(() => Number(route.params.owner_id));

const playlistsKey = computed(() => `playlists-${ownerId.value}`);
const { data, pending, error } = useAsyncData<{ count: number; playlists: TPlaylist[] }>(
	playlistsKey,
	() => $fetch<{ count: number; playlists: TPlaylist[] }>(`/api/vk/playlists`, {
		params: {
			owner_id: ownerId.value
		}
	}),
	{
		immediate: true,
		getCachedData: (key) => {
			const cached = useNuxtApp().payload.data[key];
			if (cached && Date.now() - (cached._timestamp || 0) < 20000) {
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

const playlists = computed(() => {
	if (!data.value?.playlists) {
		return [];
	}
	const playlistsData = data.value.playlists;
	const filtered: TPlaylist[] = [];
	for (let i = 0; i < playlistsData.length; i++) {
		const playlist = playlistsData[i];
		if (playlist && playlist.playlist_id !== -1) {
			filtered.push(playlist);
		}
	}
	return filtered;
});

const totalCount = computed(() => data.value?.count || 0);
const hasMore = computed(() => {
	return playlists.value.length < totalCount.value;
});

const loadMoreRef = ref<HTMLElement | null>(null);
const isLoadingMore = ref(false);

const loadMore = async () => {
	if (!hasMore.value || pending.value || isLoadingMore.value) {
		return;
	}

	isLoadingMore.value = true;

	const result = await $fetch<{ count: number; playlists: TPlaylist[] }>(`/api/vk/playlists`, {
		params: {
			owner_id: ownerId.value,
			offset: playlists.value.length
		}
	}).catch((error) => {
		console.error("Failed to load more playlists:", error);
		return null;
	});

	if (result && data.value) {
		for (let i = 0; i < result.playlists.length; i++) {
			const playlist = result.playlists[i];
			if (playlist && playlist.playlist_id !== -1) {
				data.value.playlists.push(playlist);
			}
		}
		data.value.count = result.count;
	}

	isLoadingMore.value = false;
};

useIntersectionObserver(
	loadMoreRef,
	(entries) => {
		if (entries[0]?.isIntersecting) {
			if (!hasMore.value || isLoadingMore.value) {
				return;
			}
			loadMore();
		}
	},
	{
		threshold: 0.1,
		rootMargin: "200px",
		enabled: computed(() => hasMore.value && !isLoadingMore.value)
	}
);
</script>

<style scoped lang="scss">
.playlists-tab {
	display: flex;
	flex-direction: column;
	min-height: 100%;
}

.loading,
.error {
	text-align: center;
	padding: 40px;

	@media (max-width: 768px) {
		padding: 30px 20px;
	}

	@media (max-width: 480px) {
		padding: 20px 16px;
	}
}

.playlists-content {
	display: flex;
	flex-direction: column;
	gap: 20px;

	@media (max-width: 768px) {
		gap: 16px;
	}

	@media (max-width: 480px) {
		gap: 12px;
	}
}

.empty-state {
	text-align: center;
	padding: 40px;
	color: var(--text-secondary, #b3b3b3);

	@media (max-width: 768px) {
		padding: 30px 20px;
	}

	@media (max-width: 480px) {
		padding: 20px 16px;
		font-size: 14px;
	}
}

.playlists-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
	gap: 20px;
	padding: 0 32px 32px;

	@media (max-width: 768px) {
		grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
		gap: 16px;
		padding: 0 16px 16px;
	}

	@media (max-width: 480px) {
		grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
		gap: 12px;
		padding: 0 12px 12px;
	}
}

.load-more {
	text-align: center;
	padding: 20px;

	@media (max-width: 768px) {
		padding: 16px;
	}

	@media (max-width: 480px) {
		padding: 12px;
	}

	button {
		padding: 10px 20px;
		background: var(--secondary, #e9003f);
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		transition: background 0.2s;
		font-size: 14px;

		@media (max-width: 480px) {
			padding: 8px 16px;
			font-size: 12px;
		}

		&:hover:not(:disabled) {
			background: var(--secondary-hover, #c70033);
		}

		&:disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}
	}
}
</style>

