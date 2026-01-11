<template>
	<div class="page" id="search-playlists-page">
		<div class="page-header">
			<h1 class="page-title">{{ title }}</h1>
		</div>

		<div v-if="loading && !playlists.length" class="loading">
			<LoadingSpinner />
		</div>

		<div v-else-if="error" class="error">
			{{ error }}
		</div>

		<div v-else class="content">
			<div v-if="playlists.length > 0" class="playlists-grid">
				<PlaylistCard
					v-for="playlist in playlists"
					:key="playlist.raw_id"
					:playlist="playlist"
					:show-play-button="true"
				/>
			</div>

			<div v-else class="no-results">
				Ничего не найдено
			</div>

			<div v-if="hasMore" class="load-more" ref="loadMoreRef">
				<LoadingSpinner v-if="loadingMore" />
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { TPlaylist, TMore } from "~~/server/utils/types";

const route = useRoute();
const query = computed(() => route.query.q as string || "");
const link = computed(() => route.query.link as string || "");

const title = computed(() => {
	if (query.value) {
		return `Плейлисты: ${query.value}`;
	}
	return "Все плейлисты";
});

const playlists = ref<TPlaylist[]>([]);
const more = ref<TMore | null>(null);
const loading = ref(true);
const loadingMore = ref(false);
const error = ref<string | null>(null);
const loadMoreRef = ref<HTMLElement | null>(null);

const hasMore = computed(() => {
	return Boolean(more.value && more.value.section_id && more.value.next_from);
});

const loadData = async (linkParam?: string, nextFrom?: string) => {
	if (!linkParam && !link.value) {
		error.value = "Ссылка не указана";
		loading.value = false;
		return;
	}

	const linkToUse = linkParam || link.value;

	const params: Record<string, string> = { link: linkToUse };
	if (nextFrom) {
		params.next_from = nextFrom;
	}

	const response = await $fetch<{
		playlists: TPlaylist[];
		more: TMore | null;
	}>("/api/vk/search/category/playlists", {
		params
	}).catch((err: Error) => {
		error.value = err.message || "Ошибка загрузки плейлистов";
		console.error("Failed to load playlists", err);
		return null;
	});

	if (response) {
		if (nextFrom) {
			playlists.value.push(...response.playlists);
		} else {
			playlists.value = response.playlists;
		}

		more.value = response.more;
		error.value = null;
	}

	loading.value = false;
	loadingMore.value = false;
};

const loadMore = async () => {
	if (loadingMore.value || !hasMore.value || !more.value) {
		return;
	}

	loadingMore.value = true;
	await loadData(link.value, more.value.next_from);
};

onMounted(() => {
	if (link.value) {
		loadData();
	} else {
		error.value = "Ссылка не указана";
		loading.value = false;
	}
});

useScrollLoad(() => {
	if (!loading.value && !loadingMore.value && hasMore.value) {
		loadMore();
	}
}, {
	threshold: 200,
	enabled: computed(() => hasMore.value && !loading.value && !loadingMore.value)
});
</script>

<style scoped lang="scss">
.page {
	padding: 20px;
	max-width: 1400px;
	margin: 0 auto;

	@media (max-width: 768px) {
		padding: 12px;
	}

	@media (max-width: 480px) {
		padding: 8px;
	}
}

.page-header {
	margin-bottom: 30px;

	@media (max-width: 768px) {
		margin-bottom: 20px;
	}

	@media (max-width: 480px) {
		margin-bottom: 16px;
	}
}

.page-title {
	margin: 0;
	font-size: 32px;
	font-weight: 700;
	color: var(--text, #fff);

	@media (max-width: 768px) {
		font-size: 24px;
	}

	@media (max-width: 480px) {
		font-size: 20px;
	}
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

.content {
	display: flex;
	flex-direction: column;
	gap: 30px;
}

.playlists-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
	gap: 20px;

	@media (max-width: 768px) {
		grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
		gap: 16px;
	}

	@media (max-width: 480px) {
		grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
		gap: 12px;
	}
}

.no-results {
	text-align: center;
	padding: 40px;
	color: var(--text-secondary, #b3b3b3);

	@media (max-width: 768px) {
		padding: 30px 20px;
	}

	@media (max-width: 480px) {
		padding: 20px 16px;
	}
}

.load-more {
	text-align: center;
	padding: 40px;
	display: flex;
	justify-content: center;
	align-items: center;
}
</style>

