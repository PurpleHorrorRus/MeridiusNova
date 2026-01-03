<template>
	<div class="page" id="search-page">
		<div class="search-header">
			<div class="search-input-wrapper">
				<Icon name="mdi:magnify" size="20" class="search-icon" />
			<input
				v-model="query"
				type="text"
				class="search-input"
					:placeholder="getString('search.placeholder')"
				@keyup.enter="handleSearch"
			/>
				<button
					v-if="query"
					@click="clearSearch"
					class="search-clear"
				>
					<Icon name="mdi:close" size="16" />
			</button>
			</div>
		</div>

		<div v-if="searchError && !results" class="error">
			{{ searchError }}
		</div>

		<div v-if="!results && loading" class="loading">
			<LoadingSpinner />
		</div>

		<div v-else-if="results" class="search-results">
			<!-- Отображаем категории, если они есть -->
			<template v-if="results.categories && results.categories.length > 0">
				<div
					v-for="category in sortedCategories"
					:key="category.id"
					class="section"
					v-show="hasCategoryContent(category)"
				>
					<div class="section-header">
						<h2 class="section-title">{{ category.title }}</h2>
						<button
							v-if="hasMoreCategory(category) && category.type !== 'global_audios'"
							@click="handleLoadMoreCategory(category.id)"
							class="show-more-button"
							:disabled="loading || isLoadingCategory(category.id)"
						>
							<LoadingSpinner v-if="isLoadingCategory(category.id)" size="16" />
							<span v-else>Показать еще</span>
						</button>
						<NuxtLink
							v-else-if="category.link && (category.type === 'playlists' || category.type === 'artists')"
							:to="getCategoryLink(category)"
							class="show-all-link"
						>
							Показать все
						</NuxtLink>
					</div>

					<!-- Треки -->
					<div v-if="category.audios && category.audios.length > 0" :class="category.type === 'owned_audios' ? 'songs-grid' : 'songs-list'">
						<Song
							v-for="(audio, index) in category.audios"
							:key="audio.full_id"
							:audio="audio"
							:index="category.type === 'owned_audios' ? undefined : index"
						/>
					</div>

					<!-- Плейлисты -->
					<div v-if="category.playlists && category.playlists.length > 0" class="playlists-list">
						<PlaylistCard
							v-for="playlist in category.playlists"
							:key="playlist.raw_id"
							:playlist="playlist"
							:show-play-button="true"
						/>
					</div>

					<!-- Артисты -->
					<div v-if="category.artists && category.artists.length > 0" class="artists-list">
						<ArtistCard
							v-for="artist in category.artists"
							:key="artist.id"
							:artist="artist"
						/>
					</div>

					<!-- Автоматическая подгрузка для "Все треки" -->
					<div
						v-if="category.type === 'global_audios' && hasMoreCategory(category)"
						class="load-more"
						:ref="el => setLoadMoreRef(category.id, el)"
					>
						<LoadingSpinner v-if="loading || isLoadingCategory(category.id)" />
					</div>
				</div>
			</template>

			<!-- Обратная совместимость: отображаем старые поля, если категорий нет -->
			<template v-else>
				<div v-if="results.collections && results.collections.length > 0" class="section">
					<h2>Коллекции</h2>
					<div
						v-for="collection in results.collections"
						:key="collection.title"
						class="collection-item"
					>
						<h3>{{ collection.title }}</h3>
						<div class="playlists-list">
							<PlaylistCard
								v-for="playlist in collection.playlists"
								:key="playlist.raw_id"
								:playlist="playlist"
								:show-play-button="true"
							/>
						</div>
					</div>
				</div>

				<div v-if="results.playlists && results.playlists.length > 0" class="section">
					<h2>Плейлисты</h2>
					<div class="playlists-list">
						<PlaylistCard
							v-for="playlist in results.playlists"
							:key="playlist.raw_id"
							:playlist="playlist"
							:show-play-button="true"
						/>
					</div>
				</div>

				<div v-if="results.artists && results.artists.length > 0" class="section">
					<h2>Исполнители</h2>
					<div class="artists-list">
						<ArtistCard
							v-for="artist in results.artists"
							:key="artist.id"
							:artist="artist"
						/>
					</div>
				</div>

				<div v-if="results.audios && results.audios.length > 0" class="section">
					<h2>Треки</h2>
					<div class="songs-list">
						<Song
							v-for="(audio, index) in results.audios"
							:key="audio.full_id"
							:audio="audio"
							:index="index"
						/>
					</div>
				</div>

				<div v-if="hasMore" class="load-more" ref="loadMoreRef">
					<LoadingSpinner v-if="loading" />
				</div>
			</template>

			<div v-if="!hasAnyResults" class="no-results">
				Ничего не найдено
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { TSearchCategory } from "~~/server/utils/types";
import type { TPlaylist, TAudio } from "~~/server/utils/types";
import { provideSongsContext } from "~/composables/useSongsContext";

const { getString } = useStrings();

// useSearch is auto-imported from app/composables

const { query: searchQuery, results, loading, error: searchError, search, loadMore, loadMoreCategory, clear: clearSearchStore } = useSearch();
const { setCurrent } = usePlaylist();
const { setQueue, appendToQueue } = useQueue();
const playlistStore = usePlaylistStore();

const query = ref("");
let searchTimeout: ReturnType<typeof setTimeout> | null = null;
const isInitializing = ref(false);

const handleSearch = async () => {
	if (query.value.trim()) {
		await search(query.value);
	}
};

// Обертка для loadMore с добавлением треков в очередь
const handleLoadMore = async () => {
	if (!loading.value && hasMore.value) {
		const oldAudiosCount = allSearchAudios.value.length;
		await loadMore();
		
		// Если поиск играет, добавляем новые треки в очередь
		const isSearchPlaying = playlistStore.playing && searchPlaylist.value && playlistStore.playing.raw_id === searchPlaylist.value.raw_id;
		if (isSearchPlaying && allSearchAudios.value.length > oldAudiosCount) {
			const newAudios = allSearchAudios.value.slice(oldAudiosCount);
			appendToQueue(newAudios);
		}
	}
};

// Обертка для loadMoreCategory с добавлением треков в очередь
const handleLoadMoreCategory = async (categoryId: string) => {
	const category = results.value?.categories?.find(categoryItem => categoryItem.id === categoryId);
	if (!category) {
		return;
	}
	
	const oldAudiosCount = category.audios ? category.audios.length : 0;
	await loadMoreCategory(categoryId);
	
	// Получаем обновленную категорию после загрузки
	const updatedCategory = results.value?.categories?.find(categoryItem => categoryItem.id === categoryId);
	if (!updatedCategory || !updatedCategory.audios) {
		return;
	}
	
	// Если поиск играет, добавляем новые треки в очередь
	const isSearchPlaying = playlistStore.playing && searchPlaylist.value && playlistStore.playing.raw_id === searchPlaylist.value.raw_id;
	if (isSearchPlaying && updatedCategory.audios.length > oldAudiosCount) {
		const newAudios = updatedCategory.audios.slice(oldAudiosCount);
		appendToQueue(newAudios);
	}
};

const clearSearch = () => {
	query.value = "";
	clearSearchStore();
};

const hasMore = computed(() => {
	if (!results.value?.more) {
		return false;
	}
	return Boolean(results.value.more.section_id && results.value.more.next_from);
});

const hasMoreCategory = (category: TSearchCategory): boolean => {
	// Проверяем и next, и more напрямую
	return Boolean(category.next || (category.more && category.more.section_id && category.more.next_from));
};

const hasCategoryContent = (category: TSearchCategory): boolean => {
	return Boolean(
		(category.audios && category.audios.length > 0) ||
		(category.playlists && category.playlists.length > 0) ||
		(category.artists && category.artists.length > 0)
	);
};

const sortedCategories = computed(() => {
	if (!results.value?.categories) {
		return [];
	}

	const order = ["playlists", "artists", "global_audios"];
	
	return [...results.value.categories]
		.filter(category => hasCategoryContent(category))
		.sort((categoryA, categoryB) => {
			const indexA = order.indexOf(categoryA.type);
			const indexB = order.indexOf(categoryB.type);
			
			if (indexA === -1 && indexB === -1) {
				return 0;
			}
			if (indexA === -1) {
				return 1;
			}
			if (indexB === -1) {
				return -1;
			}
			
			return indexA - indexB;
		});
});

const hasAnyResults = computed(() => {
	if (!results.value) {
		return false;
	}

	if (results.value.categories && results.value.categories.length > 0) {
		return results.value.categories.some(cat => 
			(cat.audios && cat.audios.length > 0) ||
			(cat.playlists && cat.playlists.length > 0) ||
			(cat.artists && cat.artists.length > 0)
		);
	}

	return Boolean(
		(results.value.audios && results.value.audios.length > 0) ||
		(results.value.playlists && results.value.playlists.length > 0) ||
		(results.value.artists && results.value.artists.length > 0) ||
		(results.value.collections && results.value.collections.length > 0)
	);
});

const loadMoreRef = ref<HTMLElement | null>(null);
const categoryLoadMoreRefs = ref<Record<string, HTMLElement | null>>({});
const loadingCategoryId = ref<string | null>(null);

const setLoadMoreRef = (categoryId: string, el: Element | ComponentPublicInstance | null) => {
	if (el) {
		const element = (el as HTMLElement) || ((el as ComponentPublicInstance).$el as HTMLElement);
		if (element) {
			categoryLoadMoreRefs.value[categoryId] = element;
		}
	}
};

const isLoadingCategory = (categoryId: string) => {
	return loadingCategoryId.value === categoryId;
};

// Собираем все треки из поиска для контекста (фильтруем restricted)
const allSearchAudios = computed<TAudio[]>(() => {
	if (!results.value) {
		return [];
	}

	const allAudios: TAudio[] = [];
	
	if (results.value.categories && results.value.categories.length > 0) {
		// Собираем треки из всех категорий
		results.value.categories.forEach(category => {
			if (category.audios && category.audios.length > 0) {
				allAudios.push(...category.audios);
			}
		});
	} else if (results.value.audios && results.value.audios.length > 0) {
		// Обратная совместимость
		allAudios.push(...results.value.audios);
	}

	// Фильтруем restricted треки
	return allAudios.filter(audioItem => !audioItem.is_restriction);
});

// Предоставляем контекст треков для компонентов Song (передаем computed для реактивности)
provideSongsContext(allSearchAudios);

// Создаем виртуальный плейлист для поиска
const searchPlaylist = computed<TPlaylist | null>(() => {
	if (allSearchAudios.value.length === 0) {
		return null;
	}

	const searchQueryValue = searchQuery.value || "";
	
	return {
		owner_id: 0,
		playlist_id: -1,
		raw_id: `search_${searchQueryValue}`,
		title: getString("queue.source.search"),
		cover_url: "",
		description: searchQueryValue,
		size: allSearchAudios.value.length,
		listens: 0,
		last_updated: 0,
		explicit: false,
		followed: false,
		official: false,
		restricted: false,
		access_hash: "",
		follow_hash: "",
		edit_hash: "",
		list: allSearchAudios.value,
		link: `/search?q=${encodeURIComponent(searchQueryValue)}`
	};
});

// Устанавливаем поиск как текущий плейлист при изменении результатов
watch([searchPlaylist, allSearchAudios], ([newPlaylist, newAudios]) => {
	if (newPlaylist && newAudios.length > 0) {
		// Обновляем плейлист в store, чтобы треки были доступны для воспроизведения
		setCurrent(newPlaylist).catch(() => {
			// Игнорируем ошибки при установке плейлиста
		});
		
		// Обновляем очередь треков только если поиск сейчас играет
		const isSearchPlaying = playlistStore.playing && playlistStore.playing.raw_id === newPlaylist.raw_id;
		
		if (isSearchPlaying) {
			// Если поиск играет, обновляем очередь
			setQueue(newAudios, newPlaylist);
		}
	}
}, { immediate: true, deep: true });

watch(query, (newValue) => {
	if (searchTimeout) {
		clearTimeout(searchTimeout);
	}

	// Если это инициализация из route, не используем задержку
	if (isInitializing.value) {
		isInitializing.value = false;
		if (newValue.trim()) {
			handleSearch();
		}
		return;
	}

	if (newValue.trim()) {
		searchTimeout = setTimeout(() => {
			handleSearch();
		}, 500);
	} else {
		clearSearchStore();
	}
});

// Основной обработчик скролла для загрузки (обратная совместимость - когда нет категорий)
useScrollLoad(() => {
	handleLoadMore();
}, {
	threshold: 200,
	enabled: computed(() => hasMore.value && !loading.value && (!results.value?.categories || results.value.categories.length === 0))
});

// Обработчик скролла для категории "Все треки"
useScrollLoad(() => {
	if (loading.value) {
		return;
	}

	// Находим категорию "Все треки" с more
	const globalAudiosCategory = sortedCategories.value.find(
		cat => cat.type === "global_audios" && hasMoreCategory(cat)
	);

	if (globalAudiosCategory) {
		loadingCategoryId.value = globalAudiosCategory.id;
		
		if (globalAudiosCategory.next) {
			handleLoadMoreCategory(globalAudiosCategory.id).finally(() => {
				loadingCategoryId.value = null;
			});
		} else if (globalAudiosCategory.more && globalAudiosCategory.more.section_id && globalAudiosCategory.more.next_from) {
			handleLoadMoreCategory(globalAudiosCategory.id).finally(() => {
				loadingCategoryId.value = null;
			});
		} else {
			loadingCategoryId.value = null;
		}
	}
}, {
	threshold: 200,
	enabled: computed(() => {
		const categories = sortedCategories.value;
		const globalAudiosCategories = categories.filter(category => category.type === "global_audios");
		const hasGlobalAudiosWithMore = globalAudiosCategories.some(category => hasMoreCategory(category));
		return !loading.value && hasGlobalAudiosWithMore;
	})
});

const getCategoryLink = (category: TSearchCategory) => {
	if (!category.link) {
		return "";
	}

	const query = searchQuery.value || "";
	const params = new URLSearchParams();
	params.set("link", category.link);
	if (query) {
		params.set("q", query);
	}

	if (category.type === "playlists") {
		return `/search/playlists?${params.toString()}`;
	} else if (category.type === "artists") {
		return `/search/artists?${params.toString()}`;
	}

	return "";
};

onMounted(() => {
	const route = useRoute();

	if (route.query.q) {
		isInitializing.value = true;
		query.value = route.query.q as string;
		// handleSearch() будет вызван автоматически через watch(query) без задержки
	}
});
</script>

<style scoped lang="scss">
.page {
	padding: 20px;
	width: 100%;
	margin: 0 auto;

	@media (max-width: 768px) {
		padding: 12px;
	}

	@media (max-width: 480px) {
		padding: 8px;
	}
}

.search-header {
	margin-bottom: 30px;
	width: 100%;

	@media (max-width: 768px) {
		margin-bottom: 20px;
	}

	@media (max-width: 480px) {
		margin-bottom: 16px;
	}
}

.search-input-wrapper {
	position: relative;
	display: flex;
	align-items: center;
	background: var(--bg-tertiary, #2a2a2a);
	border-radius: 8px;
	padding: 12px 16px;
	gap: 12px;
	width: 100%;

	@media (max-width: 768px) {
		padding: 10px 14px;
		gap: 10px;
	}

	@media (max-width: 480px) {
		padding: 8px 12px;
		gap: 8px;
		border-radius: 6px;
	}
}

.search-icon {
	color: var(--text-secondary, #b3b3b3);
	flex-shrink: 0;
}

.search-input {
	flex: 1;
	background: transparent;
	border: none;
	outline: none;
	color: var(--text, #fff);
	font-size: 14px;
	min-width: 0;

	@media (max-width: 480px) {
		font-size: 13px;
	}

	&::placeholder {
		color: var(--text-secondary, #b3b3b3);
	}
}

.search-clear {
	background: none;
	border: none;
	cursor: pointer;
	padding: 4px;
	color: var(--text-secondary, #b3b3b3);
	display: flex;
	align-items: center;
	justify-content: center;
	transition: color 0.2s;
	flex-shrink: 0;

	&:hover {
		color: var(--text, #fff);
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

.search-results {
	display: flex;
	flex-direction: column;
	gap: 40px;

	@media (max-width: 768px) {
		gap: 30px;
	}

	@media (max-width: 480px) {
		gap: 24px;
	}
}

.section {
	margin-bottom: 40px;

	@media (max-width: 768px) {
		margin-bottom: 30px;
	}

	@media (max-width: 480px) {
		margin-bottom: 24px;
	}

	&:last-child {
		margin-bottom: 0;
	}
}

.section-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 20px;
	gap: 16px;

	@media (max-width: 768px) {
		margin-bottom: 16px;
		gap: 12px;
	}

	@media (max-width: 480px) {
		margin-bottom: 12px;
		gap: 8px;
		flex-wrap: wrap;
	}
}

.section-title {
	margin: 0;
	font-size: 24px;
	font-weight: 700;
	color: var(--text, #fff);

	@media (max-width: 768px) {
		font-size: 20px;
	}

	@media (max-width: 480px) {
		font-size: 18px;
	}
}

.show-more-button,
.show-all-link {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 8px 16px;
	background: transparent;
	border: 1px solid var(--border, #2a2a2a);
	border-radius: 20px;
	color: var(--text-secondary, #b3b3b3);
	font-size: 13px;
	font-weight: 500;
	cursor: pointer;
	transition: all 0.2s;
	white-space: nowrap;
	text-decoration: none;

	@media (max-width: 768px) {
		padding: 6px 12px;
		font-size: 12px;
		gap: 6px;
	}

	@media (max-width: 480px) {
		padding: 6px 10px;
		font-size: 11px;
	}

	&:hover:not(:disabled) {
		border-color: var(--text, #fff);
		color: var(--text, #fff);
	}

	&:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
}

.show-all-link {
	&:hover {
		border-color: var(--text, #fff);
		color: var(--text, #fff);
	}
}

.artists-list {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
	gap: 20px;

	@media (max-width: 768px) {
		grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
		gap: 16px;
	}

	@media (max-width: 480px) {
		grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
		gap: 12px;
	}
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

.playlists-list {
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

.playlist-item {
	display: flex;
	flex-direction: column;
	gap: 10px;
	cursor: pointer;
	transition: transform 0.2s;

	&:hover {
		transform: scale(1.05);
	}
}

.playlist-cover {
	width: 100%;
	aspect-ratio: 1;
	object-fit: cover;
	border-radius: 8px;
}

.playlist-info {
	display: flex;
	flex-direction: column;
	gap: 5px;
}

.playlist-title {
	font-weight: 600;
}

.playlist-size {
	font-size: 12px;
	color: #666;
}

.songs-list {
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.songs-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
	gap: 12px;

	@media (min-width: 640px) {
		grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
		gap: 16px;
	}

	@media (min-width: 1024px) {
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 20px;
	}

	@media (max-width: 600px) {
		grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
		gap: 10px;
	}
}

.no-results {
	text-align: center;
	padding: 40px;
	color: #666;
}

.load-more {
	text-align: center;
	padding: 40px;
	display: flex;
	justify-content: center;
	align-items: center;
}
</style>

