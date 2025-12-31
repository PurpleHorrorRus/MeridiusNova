<template>
	<div class="artist-popular">
		<div v-if="pending" class="loading">
			<LoadingSpinner />
		</div>

		<div v-else-if="error" class="error">
			{{ error }}
		</div>

		<div v-else-if="audios && audios.length > 0" class="popular-content">
			<h1 class="page-title">Популярные треки</h1>

			<div class="songs-list">
				<Song
					v-for="(audio, index) in audios"
					:key="audio.full_id"
					:audio="audio"
				/>
			</div>

		<div v-if="hasMore" class="load-more" ref="loadMoreRef">
			<LoadingSpinner v-if="isLoadingMore" />
		</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { TAudio } from "~~/server/api/vk/audio/types";

const route = useRoute();
const artistParam = route.params.artist as string;

const audios = ref<TAudio[]>([]);
const pending = ref(true);
const error = ref<string | null>(null);
const hasMore = ref(false);
const isLoadingMore = ref(false);
const loadMoreRef = ref<HTMLElement | null>(null);

const loadPopular = async () => {
	pending.value = true;
	error.value = null;

		const data = await $fetch(`/api/vk/artists/${artistParam}`, {
			params: {
				list: true
			}
	}).catch((err: Error) => {
		error.value = err.message || "Failed to load popular tracks";
		console.error("Failed to load popular tracks:", err);
		return null;
		});

	if (data) {
		audios.value = data.audios || [];
		hasMore.value = false; // TODO: Implement pagination
	}

	pending.value = false;
};

onMounted(async () => {
	await loadPopular();
});

useIntersectionObserver(loadMoreRef, async (entries) => {
	if (!hasMore.value || isLoadingMore.value) {
		return;
	}

	const firstEntry = entries[0];
	if (firstEntry && firstEntry.isIntersecting) {
		isLoadingMore.value = true;
		// TODO: Implement load more
		isLoadingMore.value = false;
	}
}, {
	threshold: 0.1
});
</script>

<style scoped lang="scss">
.artist-popular {
	padding: 20px;
}

.page-title {
	font-size: 32px;
	font-weight: 700;
	margin-bottom: 30px;
}

.songs-list {
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.loading,
.error {
	text-align: center;
	padding: 40px;
}

.load-more {
	text-align: center;
	padding: 20px;
}
</style>
