<template>
	<div class="general">
		<div v-if="pending && !general?.length && !exploreData && !error" class="loading">
			<SkeletonGeneral />
		</div>

		<div v-else-if="error && !general?.length && !exploreData" class="error">
			{{ getString("general.error") }}: {{ error }}
		</div>

		<div v-else class="general-content">
			<!-- Refresh button -->
			<div class="refresh-header">
				<button @click="handleRefresh" :disabled="isRefreshing" class="refresh-button" :class="{ refreshing: isRefreshing }">
					<Icon name="mdi:refresh" :size="18" />
				</button>
			</div>

			<!-- Recommendations -->
			<div v-if="recommendations && recommendations.playlists && recommendations.playlists.length > 0" class="section">
				<h2 class="section-title">{{ recommendations.title || getString("general.recommendations") }}</h2>
				<div class="playlists-grid">
					<LazyPlaylistCard
						v-for="(item, index) in recommendations.playlists"
						:key="`rec-${index}-${(item as ReadonlyPlaylistLike).owner_id}-${(item as ReadonlyPlaylistLike).playlist_id}`"
						v-memo="[(item as ReadonlyPlaylistLike).raw_id, (item as ReadonlyPlaylistLike).owner_id, (item as ReadonlyPlaylistLike).playlist_id]"
						hydrate-on-visible
						:playlist="toMutablePlaylist(item as ReadonlyPlaylistLike)"
						:show-play-button="true"
					/>
				</div>
			</div>

			<!-- VK Mix -->
			<div class="section">
				<VKMix />
			</div>

			<!-- User Playlists Category -->
			<div v-if="userPlaylistsCategory?.playlists?.length" class="section" ref="userPlaylistsSectionRef">
				<h2 class="section-title">{{ userPlaylistsCategory.title || "Слушайте друг друга" }}</h2>
				<div class="user-playlists-list">
					<UserPlaylist
						v-for="playlist in userPlaylistsCategory.playlists"
						:key="`user-${playlist.owner_id}-${playlist.playlist_id}`"
						:playlist="toMutablePlaylist(playlist as ReadonlyPlaylistLike)"
					/>
				</div>
			</div>

			<!-- Vibe -->
			<div v-if="vibes && vibes.playlists && vibes.playlists.length > 0" class="section">
				<h2 class="section-title">{{ vibes.title || "Vibe" }}</h2>
				<div class="playlists-grid">
					<LazyPlaylistCard
						v-for="playlist in vibes.playlists"
						:key="`vibe-${playlist.owner_id}-${playlist.playlist_id}`"
						v-memo="[playlist.raw_id, playlist.owner_id, playlist.playlist_id]"
						hydrate-on-visible
						:playlist="toMutablePlaylist(playlist as ReadonlyPlaylistLike)"
						:show-play-button="true"
					/>
				</div>
			</div>

			<!-- New Albums -->
			<div v-if="exploreData && exploreData.albums && exploreData.albums.length > 0" class="section">
				<h2 class="section-title">{{ getString("general.newAlbums") }}</h2>
				<div class="albums-list">
					<LazyAlbumCard
						v-for="album in exploreData.albums"
						:key="`album-${album.owner_id || ''}-${album.playlist_id || ''}`"
						v-memo="[album.owner_id, album.playlist_id]"
						hydrate-on-visible
						:album="album"
						:show-play-button="true"
					/>
				</div>
			</div>

			<!-- New Artists -->
			<div v-if="exploreData && exploreData.artists && exploreData.artists.length > 0" class="section">
				<h2 class="section-title">{{ getString("general.newArtists") }}</h2>
				<div class="artists-grid">
					<LazyArtistCard
						v-for="artist in exploreData.artists"
						:key="`artist-${artist.full_id}`"
						v-memo="[artist.full_id]"
						hydrate-on-visible
						:artist="toMutableArtist(artist)"
					/>
				</div>
			</div>

			<!-- Releases -->
			<div v-if="exploreData && exploreData.releases && exploreData.releases.length > 0" class="section">
				<h2 class="section-title">{{ getString("general.newReleases") }}</h2>
				<div class="songs-list">
					<LazySong
						v-for="release in exploreData.releases"
						:key="`release-${release.full_id}`"
						hydrate-on-visible
						:audio="toMutableAudio(release)"
					/>
				</div>
			</div>

			<!-- Chart -->
			<div v-if="exploreData && exploreData.chart && exploreData.chart.length > 0" class="section">
				<h2 class="section-title">{{ getString("general.chart") }}</h2>
				<div class="chart-list">
					<div
						v-for="(track, index) in exploreData.chart"
						:key="`chart-${track.full_id}`"
						class="chart-item"
					>
						<span class="chart-position">{{ index + 1 }}</span>
						<LazySong hydrate-on-visible :audio="toMutableAudio(track)" />
					</div>
				</div>
			</div>

			<!-- Collections from general -->
			<div
				v-for="collection in generalCollections"
				:key="`general-${collection.title}`"
				class="section"
			>
				<h2 class="section-title" v-text="collection.title" />
				<div class="playlists-grid">
					<LazyPlaylistCard
						v-for="playlist in collection.playlists"
						:key="`general-${playlist.owner_id}-${playlist.playlist_id}`"
						v-memo="[playlist.raw_id, playlist.owner_id, playlist.playlist_id]"
						hydrate-on-visible
						:playlist="toMutablePlaylist(playlist as ReadonlyPlaylistLike)"
						:show-play-button="true"
					/>
				</div>
			</div>

			<!-- Collections from explore -->
			<div
				v-for="collection in exploreCollections"
				:key="`explore-${collection.title}`"
				class="section"
			>
				<h2 class="section-title" v-text="collection.title" />
				<div class="playlists-grid">
					<LazyPlaylistCard
						v-for="playlist in collection.playlists"
						:key="`explore-${playlist.owner_id}-${playlist.playlist_id}`"
						v-memo="[playlist.raw_id, playlist.owner_id, playlist.playlist_id]"
						hydrate-on-visible
						:playlist="toMutablePlaylist(playlist as ReadonlyPlaylistLike)"
						:show-play-button="true"
					/>
				</div>
			</div>

		</div>
	</div>
</template>

<script setup lang="ts">
const { getString } = useStrings();
import { ref, onMounted, defineAsyncComponent } from "vue";

const LazySong = defineAsyncComponent(() => import("~/components/Song/Song.vue"));
const LazyPlaylistCard = defineAsyncComponent(() => import("~/components/PlaylistCard.vue"));
import UserPlaylist from "~/components/General/UserPlaylist.vue";

import { provideSongsContext } from "~/composables/useSongsContext";

import type { TPlaylistCollection, TExploreData, TPlaylist, TArtist } from "~~/server/utils/types";
import type { TAudio } from "~~/server/api/vk/audio/types";
const LazyArtistCard = defineAsyncComponent(() => import("~/components/ArtistCard.vue"));
const LazyAlbumCard = defineAsyncComponent(() => import("~/components/AlbumCard.vue"));

// Хелперы для преобразования readonly типов в обычные
type ReadonlyPlaylistLike = { readonly owner_id: number; readonly playlist_id: number; readonly raw_id: string; readonly title: string; readonly cover_url: string; readonly description: string; readonly raw_description?: string; readonly size: number; readonly listens: number; readonly last_updated: number; readonly explicit: boolean; readonly followed: boolean; readonly official: boolean; readonly restricted: boolean; readonly access_hash: string; readonly follow_hash: string; readonly edit_hash: string; readonly context?: string; readonly author?: TPlaylistAuthor; readonly covers?: readonly string[]; readonly artists?: Array<{ readonly name: string; readonly link: string; }>; readonly year?: number; readonly subtitle?: string; readonly list?: readonly unknown[]; };

type ReadonlyPlaylistInput = TPlaylist | { playlist?: TPlaylist } | Readonly<TPlaylist> | { readonly playlist?: Readonly<TPlaylist> } | ReadonlyPlaylistLike | { readonly owner_id: number; readonly playlist_id: number; readonly raw_id: string; readonly title: string; readonly cover_url: string; readonly description: string; readonly raw_description?: string; readonly size: number; readonly listens: number; readonly last_updated: number; readonly explicit: boolean; readonly followed: boolean; readonly official: boolean; readonly restricted: boolean; readonly access_hash: string; readonly follow_hash: string; readonly edit_hash: string; readonly context?: string; readonly author?: TPlaylistAuthor; readonly covers?: readonly string[]; readonly artists?: Array<{ readonly name: string; readonly link: string; }>; readonly year?: number; readonly subtitle?: string; readonly list?: readonly unknown[]; };

const toMutablePlaylist = (playlist: ReadonlyPlaylistInput): TPlaylist => {
	let p: TPlaylist;
	if ("playlist" in playlist && playlist.playlist) {
		p = { ...playlist.playlist } as TPlaylist;
	} else {
		p = { ...playlist } as TPlaylist;
	}
	const mutable: TPlaylist = {
		...p,
		covers: p.covers ? [...p.covers] : undefined,
		artists: p.artists ? [...p.artists] : undefined,
		list: p.list ? [...p.list] : undefined
	};
	return mutable;
};

const toMutableAudio = (audio: { readonly id: number; readonly owner_id: number; readonly full_id: string; readonly title: string; readonly performer: string; readonly artist?: string; readonly duration: number; readonly album?: string | readonly [number, number, string] | { readonly owner_id: number; readonly id: number; readonly access_key?: string; readonly access_hash?: string; readonly title?: string; readonly thumb?: { readonly photo_300?: string; readonly photo_600?: string; readonly photo_1200?: string }; }; readonly raw?: readonly unknown[]; [key: string]: unknown }): TAudio => {
	let album: TAudio["album"];
	if (audio.album) {
		if (Array.isArray(audio.album)) {
			album = [...audio.album] as [number, number, string];
		} else if (typeof audio.album === "object" && audio.album !== null && !Array.isArray(audio.album)) {
			const albumObj = audio.album as { readonly owner_id: number; readonly id: number; readonly access_key?: string; readonly access_hash?: string; readonly title?: string; readonly thumb?: { readonly photo_300?: string; readonly photo_600?: string; readonly photo_1200?: string }; };
			album = {
				...albumObj,
				thumb: albumObj.thumb ? { ...albumObj.thumb } : undefined
			} as { owner_id: number; id: number; access_key?: string; access_hash?: string; title?: string; thumb?: { photo_300?: string; photo_600?: string; photo_1200?: string }; };
		} else {
			album = audio.album as string;
		}
	}
	
	const mutable: TAudio = {
		...audio,
		album,
		raw: audio.raw ? [...audio.raw] : undefined
	} as TAudio;
	return mutable;
};

const toMutableArtist = (artist: { cover?: string; coverUrl_p?: string; coverUrl_s?: string; full_id: string; performer?: string; title?: string }): TArtist => {
	return {
		id: artist.full_id,
		name: artist.performer || artist.title || "",
		cover: artist.cover || artist.coverUrl_p || artist.coverUrl_s || "",
		link: artist.full_id
	};
};

const { data: general, pending: generalLoading, error: generalError, execute: loadGeneral } = useFetch<TPlaylistCollection[]>("/api/vk/general");
const currentParams = ref<{ count?: number }>({});
const { data: exploreData, pending: exploreLoading, error: exploreError, execute: executeExplore } = useFetch<TExploreData>("/api/vk/explore");

const loadExplore = async (newParams: { count?: number } = {}) => {
	currentParams.value = newParams;
	await executeExplore();
};

const pending = computed(() => {
	return generalLoading.value || exploreLoading.value;
});

const error = computed(() => {
	return generalError.value || exploreError.value;
});

const isRefreshing = ref(false);

const handleRefresh = async () => {
	if (isRefreshing.value) return;

	isRefreshing.value = true;

	// Очищаем кэш
	await clearNuxtData("general");
	await clearNuxtData((key) => key.startsWith("explore-"));

	// Перезагружаем данные
	await Promise.all([
		loadGeneral(),
		loadExplore({ count: 6 })
	]);

	isRefreshing.value = false;
};

// Find recommendations (type === "recommendations" with popup param)
const recommendations = computed(() => {
	if (!general.value || general.value.length === 0) {
		return null;
	}

	return general.value.find(category => {
		if (category.type !== "recommendations") return false;
		if (!category.params) return false;
		
		// Проверяем, является ли params URLSearchParams или обычным объектом
		if (category.params instanceof URLSearchParams) {
			return category.params.get("popup")?.includes("recoms");
		}
		
		// Если params - это объект после сериализации
		if (typeof category.params === "object" && category.params !== null && "popup" in category.params) {
			return category.params.popup && String(category.params.popup).includes("recoms");
		}
		
		return false;
	});
});

// Find user playlists category (usually first item)
const userPlaylistsCategory = computed(() => {
	if (!general.value || general.value.length === 0) {
		return null;
	}
	
	// Ищем первую категорию с плейлистами, которая не является recommendations или vibes
	for (const category of general.value) {
		if (category.type === "recommendations" || category.type === "vibes") {
			continue;
		}

		if (category.playlists && category.playlists.length > 0) {
			return category;
		}
	}
	
	return null;
});

// Find vibes
const vibes = computed(() => {
	if (!general.value || general.value.length === 0) {
		return null;
	}

	return general.value.find(category => category.type === "vibes");
});

// Filter general collections (exclude recommendations, vibes, and first user playlists)
const generalCollections = computed(() => {
	if (!general.value) {
		return [];
	}
	
	const filtered: typeof general.value = [];
	let skipFirst = true;
	
	for (let i = 0; i < general.value.length; i++) {
		const category = general.value[i];
		if (!category) continue;
		
		// Skip first item (user playlists)
		if (skipFirst) {
			skipFirst = false;
			continue;
		}
		
		// Skip recommendations
		if (category.type === "recommendations" && category.params) {
			let isRecommendations = false;
			if (category.params instanceof URLSearchParams) {
				isRecommendations = category.params.get("popup")?.includes("recoms") || false;
			} else if (typeof category.params === "object" && category.params !== null && "popup" in category.params) {
				isRecommendations = Boolean(category.params.popup && String(category.params.popup).includes("recoms"));
			}
			if (isRecommendations) continue;
		}
		
		// Skip vibes
		if (category.type === "vibes") continue;
		
		// Only include categories with playlists
		if (category.playlists && category.playlists.length > 0) {
			filtered.push(category);
		}
	}
	
	return filtered;
});

// Explore playlists collections
const exploreCollections = computed(() => {
	if (!exploreData.value?.playlists) return [];
	
	const filtered: typeof exploreData.value.playlists = [];
	
	for (let i = 0; i < exploreData.value.playlists.length; i++) {
		const c = exploreData.value.playlists[i];
		if (!c?.playlists) continue;
		
		if (Array.isArray(c.playlists) && c.playlists.length > 0) {
			filtered.push(c);
		} else if (typeof c.playlists === "object" && Object.keys(c.playlists).length > 0) {
			filtered.push(c);
		}
	}
	
	return filtered;
});


// Собираем все треки со страницы для контекста
const allSongs = computed(() => {
	if (!exploreData.value) {
		return [];
	}
	
	const songs: TAudio[] = [];
	
	// Releases
	if (exploreData.value.releases) {
		for (let i = 0; i < exploreData.value.releases.length; i++) {
			songs.push(toMutableAudio(exploreData.value.releases[i]));
		}
	}
	
	// Chart
	if (exploreData.value.chart) {
		for (let i = 0; i < exploreData.value.chart.length; i++) {
			songs.push(toMutableAudio(exploreData.value.chart[i]));
		}
	}
	
	// Artists (если это треки)
	if (exploreData.value.artists) {
		for (let i = 0; i < exploreData.value.artists.length; i++) {
			songs.push(toMutableAudio(exploreData.value.artists[i]));
		}
	}
	
	return songs;
});

// Предоставляем контекст треков для компонентов Song (передаем computed для реактивности)
provideSongsContext(allSongs);

const userPlaylistsSectionRef = ref<HTMLElement | null>(null);

onMounted(() => {
	// Загружаем данные асинхронно, не блокируя рендеринг
	Promise.all([
		loadGeneral(),
		loadExplore({ count: 6 })
	]);
});
</script>

<style scoped lang="scss">
.general {
	padding: 32px 48px;
	min-height: 100%;

	@media (max-width: 768px) {
		padding: 20px 24px;
	}

	@media (max-width: 480px) {
		padding: 16px 16px;
	}

	&-content {
		display: flex;
		flex-direction: column;
		gap: 48px;
		max-width: 100%;

		@media (max-width: 768px) {
			gap: 32px;
		}

		@media (max-width: 480px) {
			gap: 24px;
		}
	}
}

.section {
	display: flex;
	flex-direction: column;
	gap: 24px;

	@media (max-width: 768px) {
		gap: 20px;
	}

	@media (max-width: 480px) {
		gap: 16px;
	}

	&-title {
		font-size: 28px;
		font-weight: 700;
		margin: 0;
		color: var(--text, #fff);
		letter-spacing: -0.5px;

		@media (max-width: 768px) {
			font-size: 24px;
		}

		@media (max-width: 480px) {
			font-size: 20px;
		}
	}
}

.playlists-grid,
.albums-list {
	display: flex;
	flex-direction: row;
	column-gap: 15px;
	flex-wrap: nowrap;
	padding-bottom: 15px;
	overflow-x: auto;
}

.user-playlists-list {
	display: flex;
	flex-direction: row;
	column-gap: 15px;
	flex-wrap: nowrap;
	padding-bottom: 15px;
	overflow-x: auto;
}

.songs-list {
	display: flex;
	flex-direction: column;
	gap: 0;
	background: var(--bg-secondary, #181818);
	border-radius: 8px;
	overflow: hidden;
}

.artists-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
	gap: 24px;

	@media (max-width: 768px) {
		grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
		gap: 16px;
	}

	@media (max-width: 480px) {
		grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
		gap: 12px;
	}
}

.chart-list {
	display: flex;
	flex-direction: column;
	gap: 0;
	background: var(--bg-secondary, #181818);
	border-radius: 8px;
	overflow: hidden;
}

.chart-item {
	display: flex;
	align-items: center;
	gap: 16px;
	padding: 12px 16px;
	transition: background 0.2s ease;
	flex: 1;
	min-width: 0;

	&:hover {
		background: var(--hover, rgba(255, 255, 255, 0.1));
	}

	&:not(:last-child) {
		border-bottom: 1px solid var(--border, #282828);
	}

	:deep(.song) {
		flex: 1;
		min-width: 0;
	}
}

.chart-position {
	font-weight: 700;
	font-size: 20px;
	min-width: 32px;
	text-align: center;
	color: var(--text-secondary, #b3b3b3);
}

.loading {
	padding: 32px 48px;
}

.error {
	text-align: center;
	padding: 60px 40px;
	color: var(--text-secondary, #b3b3b3);
	font-size: 16px;
}

.refresh-header {
	display: flex;
	justify-content: flex-end;
	margin-bottom: -32px;
	padding-right: 8px;
}

.refresh-button {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 32px;
	height: 32px;
	border: none;
	background: transparent;
	border-radius: 50%;
	color: var(--text-secondary, #b3b3b3);
	cursor: pointer;
	transition: all 0.2s ease;

	&:hover:not(:disabled) {
		background: var(--hover, rgba(255, 255, 255, 0.1));
		color: var(--text, #fff);
	}

	&:disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}

	&.refreshing {
		animation: spin 1s linear infinite;
	}
}

@keyframes spin {
	from {
		transform: rotate(0deg);
	}
	to {
		transform: rotate(360deg);
	}
}
</style>

