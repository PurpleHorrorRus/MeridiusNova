<template>
	<div class="page" id="artists-page">
		<div v-if="loading" class="loading">
			<LoadingSpinner />
		</div>

		<div v-else-if="error" class="error">
			{{ error }}
		</div>

		<div v-else class="content">
			<h1 class="page-title">Исполнители</h1>
			<div class="artists-grid">
				<ArtistCard
					v-for="artist in artists"
					:key="artist.id"
					:artist="artist"
				/>
			</div>

			<div v-if="hasMore" class="load-more" ref="loadMoreRef">
				<button @click="loadMore" :disabled="loadingMore">
					Загрузить еще
				</button>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { TArtist } from "~~/server/utils/types";

const route = useRoute();
const section = computed(() => (route.query.section as string) || "explore");

const { data: artistsData, pending: loading, error } = await useAsyncData<TArtist[]>(
	"artists-list",
	async () => {
		// TODO: Implement artists.getByBlock API endpoint
		return [];
	}
);

const artists = computed(() => artistsData.value || []);
const hasMore = ref(false);
const loadingMore = ref(false);
const loadMoreRef = ref<HTMLElement | null>(null);

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

.artists-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
	gap: 20px;
}

.artist-item {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 10px;
	cursor: pointer;
	transition: transform 0.2s;

	&:hover {
		transform: scale(1.05);
	}
}

.artist-cover {
	width: 150px;
	height: 150px;
	border-radius: 50%;
	object-fit: cover;
}

.artist-name {
	text-align: center;
	font-size: 14px;
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
</style>
