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
					<PlaylistCard
						v-for="(item, index) in recommendations.playlists"
						:key="`rec-${index}-${(item as ReadonlyPlaylistLike).owner_id}-${(item as ReadonlyPlaylistLike).playlist_id}`"
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
					<PlaylistCard
						v-for="playlist in vibes.playlists"
						:key="`vibe-${playlist.owner_id}-${playlist.playlist_id}`"
						:playlist="toMutablePlaylist(playlist as ReadonlyPlaylistLike)"
						:show-play-button="true"
					/>
				</div>
			</div>

			<!-- New Albums -->
			<div v-if="exploreData && exploreData.albums && exploreData.albums.length > 0" class="section">
				<h2 class="section-title">{{ getString("general.newAlbums") }}</h2>
				<div class="albums-list">
					<AlbumCard
						v-for="album in exploreData.albums"
						:key="`album-${album.owner_id || ''}-${album.playlist_id || ''}`"
						:album="album"
						:show-play-button="true"
					/>
				</div>
			</div>

			<!-- New Artists -->
			<div v-if="exploreData && exploreData.artists && exploreData.artists.length > 0" class="section">
				<h2 class="section-title">{{ getString("general.newArtists") }}</h2>
				<div class="artists-grid">
					<ArtistCard
						v-for="artist in exploreData.artists"
						:key="`artist-${artist.full_id}`"
						:artist="toMutableArtist(artist)"
					/>
				</div>
			</div>

			<!-- Releases -->
			<div v-if="exploreData && exploreData.releases && exploreData.releases.length > 0" class="section">
				<h2 class="section-title">{{ getString("general.newReleases") }}</h2>
				<div class="songs-list">
					<Song
						v-for="release in exploreData.releases"
						:key="`release-${release.full_id}`"
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
						<Song :audio="toMutableAudio(track)" />
					</div>
				</div>
			</div>

			<!-- Collections from general -->
			<div
				v-for="collection in generalCollections"
				:key="`general-${collection.title}`"
				class="section"
			>
				<h2 class="section-title">{{ collection.title }}</h2>
				<div class="playlists-grid">
					<PlaylistCard
						v-for="playlist in collection.playlists"
						:key="`general-${playlist.owner_id}-${playlist.playlist_id}`"
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
				<h2 class="section-title">{{ collection.title }}</h2>
				<div class="playlists-grid">
					<PlaylistCard
						v-for="playlist in collection.playlists"
						:key="`explore-${playlist.owner_id}-${playlist.playlist_id}`"
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
import { ref, onMounted } from "vue";
import type { TPlaylistCollection, TExploreData, TPlaylist, TArtist } from "~~/server/utils/types";
import type { TAudio } from "~~/server/api/vk/audio/types";
import { provideSongsContext } from "~/composables/useSongsContext";
import UserPlaylist from "~/components/General/UserPlaylist.vue";

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

const { general, loading: generalLoading, error: generalError, loadGeneral } = useGeneral();
const { explore: exploreData, loading: exploreLoading, error: exploreError, loadExplore } = useExplore();

const pending = computed(() => generalLoading.value || exploreLoading.value);
const error = computed(() => generalError.value || exploreError.value);
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
	if (!general.value || general.value.length === 0) return null;
	return general.value.find(c => {
		if (c.type !== "recommendations") return false;
		if (!c.params) return false;
		
		// Проверяем, является ли params URLSearchParams или обычным объектом
		if (c.params instanceof URLSearchParams) {
			return c.params.get("popup")?.includes("recoms");
		}
		
		// Если params - это объект после сериализации
		if (typeof c.params === "object" && c.params !== null && "popup" in c.params) {
			const popup = c.params.popup;
			return popup && String(popup).includes("recoms");
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
	if (!general.value || general.value.length === 0) return null;
	return general.value.find(c => c.type === "vibes");
});

// Filter general collections (exclude recommendations, vibes, and first user playlists)
const generalCollections = computed(() => {
	if (!general.value) return [];
	
	let filtered = [...general.value];
	
	// Remove recommendations
	const recIndex = filtered.findIndex(c => {
		if (c.type !== "recommendations" || !c.params) return false;
		
		// Проверяем, является ли params URLSearchParams или обычным объектом
		if (c.params instanceof URLSearchParams) {
			return c.params.get("popup")?.includes("recoms");
		}
		
		// Если params - это объект после сериализации
		if (typeof c.params === "object" && c.params !== null && "popup" in c.params) {
			const popup = c.params.popup;
			return popup && String(popup).includes("recoms");
		}
		
		return false;
	});
	if (recIndex >= 0) {
		filtered.splice(recIndex, 1);
	}
	
	// Remove first item (user playlists)
	if (filtered.length > 0) {
		filtered.splice(0, 1);
	}
	
	// Remove vibes
	const vibesIndex = filtered.findIndex(c => c.type === "vibes");
	if (vibesIndex >= 0) {
		filtered.splice(vibesIndex, 1);
	}
	
	return filtered.filter(c => c.playlists && c.playlists.length > 0);
});

// Explore playlists collections
const exploreCollections = computed(() => {
	if (!exploreData.value || !exploreData.value.playlists) return [];
	// Проверяем, что playlists - это массив, а не объект
	return exploreData.value.playlists.filter(c => {
		if (!c.playlists) return false;
		// Если playlists - это массив
		if (Array.isArray(c.playlists)) {
			return c.playlists.length > 0;
		}
		// Если playlists - это объект, проверяем, есть ли в нем элементы
		if (typeof c.playlists === "object") {
			return Object.keys(c.playlists).length > 0;
		}
		return false;
	});
});


// Собираем все треки со страницы для контекста
const allSongs = computed(() => {
	const songs: TAudio[] = [];
	
	// Releases
	if (exploreData.value?.releases) {
		songs.push(...exploreData.value.releases.map(toMutableAudio));
	}
	
	// Chart
	if (exploreData.value?.chart) {
		songs.push(...exploreData.value.chart.map(toMutableAudio));
	}
	
	// Artists (если это треки)
	if (exploreData.value?.artists) {
		songs.push(...exploreData.value.artists.map(toMutableAudio));
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

	&-content {
		display: flex;
		flex-direction: column;
		gap: 48px;
		max-width: 100%;
	}
}

.section {
	display: flex;
	flex-direction: column;
	gap: 24px;

	&-title {
		font-size: 28px;
		font-weight: 700;
		margin: 0;
		color: var(--text, #fff);
		letter-spacing: -0.5px;
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

