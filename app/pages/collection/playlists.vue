<template>
	<div class="playlists-tab">
		<div v-if="pending && !data" class="loading">
			<LoadingSpinner />
		</div>

		<div v-else-if="error && !data" class="error">
			{{ error }}
		</div>

		<div v-else class="playlists-content">
			<div v-if="playlists.length === 0" class="empty-state">
				<p>Плейлисты не найдены</p>
			</div>

			<div v-else class="playlists-grid">
				<PlaylistCard
					v-for="playlist in playlists"
					:key="playlist.raw_id"
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
import { useVkStore } from "~/stores/vk";
import type { TPlaylist } from "~~/server/utils/types";

const route = useRoute();
const vkStore = useVkStore();

const ownerId = computed(() => {
	const ownerIdParam = route.query.owner_id as string;
	return ownerIdParam ? Number(ownerIdParam) : vkStore.user_id || 0;
});

const { data, pending, error } = useFetch<{ count: number; playlists: TPlaylist[] }>(
	() => `/api/vk/playlists`,
	{
		params: {
			owner_id: ownerId.value
		},
		immediate: true,
		cache: "no-store"
	}
);

const playlists = computed(() => {
	const playlistsData = data.value?.playlists || [];
	// Filter out "my music" playlist (playlist_id === -1)
	return playlistsData.filter(p => p.playlist_id !== -1);
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
		const newPlaylists = result.playlists.filter(p => p.playlist_id !== -1);
		data.value.playlists.push(...newPlaylists);
		data.value.count = result.count;
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
		return !isLoadingMore.value;
	})
});
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
}

.playlists-content {
	display: flex;
	flex-direction: column;
	gap: 20px;
}

.empty-state {
	text-align: center;
	padding: 40px;
	color: var(--text-secondary, #b3b3b3);
}

.playlists-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
	gap: 20px;
	padding: 0 32px 32px;
}

.load-more {
	text-align: center;
	padding: 20px;

	button {
		padding: 10px 20px;
		background: var(--secondary, #e9003f);
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		transition: background 0.2s;

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

