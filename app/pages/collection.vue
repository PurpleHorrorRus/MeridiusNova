<template>
	<div class="page" id="collection-page">
		<!-- Artist collection (old behavior) -->
		<div v-if="link" class="artist-collection">
			<div v-if="loading" class="loading">
				<LoadingSpinner />
			</div>

			<div v-else-if="error" class="error">
				{{ error }}
			</div>

			<div v-else class="content">
				<h1 class="page-title">{{ title }}</h1>
				<div class="playlists-grid">
					<PlaylistCard
						v-for="playlist in playlists"
						:key="playlist.raw_id"
						:playlist="playlist"
						:show-play-button="true"
					/>
				</div>

				<div v-if="hasMore" class="load-more" ref="loadMoreRef">
					<button @click="loadMore" :disabled="loadingMore">
						Загрузить еще
					</button>
				</div>
			</div>
		</div>

		<!-- User library with tabs -->
		<div v-else class="user-library">
			<div class="library-header">
				<h1 class="page-title">{{ libraryTitle }}</h1>
				<Navigation />
			</div>

			<NuxtPage />
		</div>
	</div>
</template>

<script setup lang="ts">
import type { TPlaylist } from "~~/server/utils/types";
import { useVkStore } from "~/stores/vk";

const { getString } = useStrings();
const route = useRoute();
const vkStore = useVkStore();

const link = computed(() => route.query.link as string);
const ownerId = computed(() => {
	const ownerIdParam = route.query.owner_id as string;
	return ownerIdParam ? Number(ownerIdParam) : vkStore.user_id || 0;
});

const title = ref("Коллекция");
const libraryTitle = computed(() => {
	if (ownerId.value === vkStore.user_id) {
		return getString("navigation.myMusic");
	}
	return "Библиотека";
});

const playlists = ref<TPlaylist[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const hasMore = ref(false);
const loadingMore = ref(false);
const loadMoreRef = ref<HTMLElement | null>(null);

onMounted(async () => {
	if (link.value) {
		loading.value = true;
		error.value = null;

		const playlistsData = await $fetch<TPlaylist[]>(`/api/vk/artists/collections`, {
			params: {
				link: link.value
			}
		}).catch((err: Error) => {
			error.value = err.message || "Failed to load collection";
			console.error("Failed to load collection:", err);
			return null;
		});

		if (playlistsData) {
			playlists.value = playlistsData;
		}

		loading.value = false;
	}
});

const loadMore = async () => {
	// TODO: Implement load more
};
</script>

<style scoped lang="scss">
.page {
	padding: 20px;
}

.loading,
.error {
	text-align: center;
	padding: 40px;
}

.content {
	display: flex;
	flex-direction: column;
	gap: 20px;
}

h1 {
	font-size: 32px;
	font-weight: 700;
}

.playlists-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
	gap: 20px;
}

.load-more {
	text-align: center;
	padding: 20px;

	button {
		padding: 10px 20px;
		background: #007bff;
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;

		&:hover:not(:disabled) {
			background: #0056b3;
		}

		&:disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}
	}
}

.user-library {
	display: flex;
	flex-direction: column;
	gap: 20px;
}

.library-header {
	display: flex;
	flex-direction: column;
	gap: 20px;
}
</style>
