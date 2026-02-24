<template>
	<div class="page" id="artist-page">
		<div v-if="loading" class="loading">
			<LoadingSpinner />
		</div>

		<div v-else-if="artistError" class="error">
			{{ artistError }}
		</div>

		<div v-else-if="current" class="artist-content">
			<div class="artist-header">
				<div v-if="current.cover.src" class="artist-cover-wrap" :class="{ blur: current.cover.blur }">
					<Cover
						v-if="!current.cover.blur"
						:src="current.cover.src"
						:width="200"
						:height="200"
					/>
					<img
						v-else
						:src="current.cover.src"
						:alt="current.name"
						class="artist-cover-img"
					/>
				</div>
				<div class="artist-info">
					<h1 class="artist-name" v-text="current.name" />
					<button
						v-if="current.follow.hash"
						@click="toggleFollow"
						class="follow-button"
						:disabled="isFollowing"
					>
						{{ isFollowing ? "…" : (current.follow.followed ? "Отписаться" : "Подписаться") }}
					</button>
				</div>
			</div>

			<div v-if="current.audios && current.audios.length > 0" class="section">
				<h2 class="section-title">Треки</h2>
				<SongList
					:songs="current.audios || []"
					:virtualized="false"
					:table-mode="true"
				/>
			</div>

			<div v-if="collectionsWithPlaylists.length > 0" class="section">
				<h2 class="section-title">Коллекции</h2>
				<div class="collections-list">
					<div
						v-for="collection in collectionsWithPlaylists"
						:key="collection.title"
						class="collection-item"
					>
						<h3 class="collection-item-title" v-text="collection.title" />
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
			</div>

			<div v-if="current.artists && current.artists.length > 0" class="section">
				<h2 class="section-title">Похожие исполнители</h2>
				<div class="artists-list">
					<ArtistCard
						v-for="artist in current.artists"
						:key="artist.id"
						:artist="artist"
					/>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";

import SongList from "~/components/SongList.vue";
import Cover from "~/components/Cover.vue";

import { useArtistsStore } from "~/stores/artists";
import { provideSongsContext } from "~/composables/useSongsContext";

const route = useRoute();
const artistParam = route.params.artist as string;

const artistsStore = useArtistsStore();
const { current, loading, error: artistError } = storeToRefs(artistsStore);

const artistSongs = computed(() => current.value?.audios ?? []);
provideSongsContext(artistSongs);

const collectionsWithPlaylists = computed(() => {
	const list = current.value?.collections;
	if (!list || !Array.isArray(list)) {
		return [];
	}
	return list.filter((collection: { playlists?: unknown[] }) => (collection.playlists?.length ?? 0) > 0);
});

onMounted(async () => {
	if (artistParam) {
		await artistsStore.loadArtist(artistParam, true);
	}
});

const isFollowing = ref(false);

const toggleFollow = async () => {
	const artist = current.value;

	if (!artist?.follow.hash || !artist.follow.id) {
		return;
	}

	isFollowing.value = true;

	const isFollowed = artist.follow.followed;
	const url = isFollowed ? "/api/vk/artists/unfollow" : "/api/vk/artists/follow";
	const body = { artist_id: artist.follow.id, hash: artist.follow.hash };

	const result = await $fetch<{ hash: string }>(url, {
		method: "POST",
		body
	}).catch(() => null);

	isFollowing.value = false;

	if (result && artistsStore.current) {
		artistsStore.current.follow.followed = !isFollowed;
		artistsStore.current.follow.hash = result.hash;
	}
};
</script>

<style scoped lang="scss">
.page {
	padding: 32px 48px;
	min-height: 100%;

	@media (max-width: 768px) {
		padding: 20px 24px;
	}

	@media (max-width: 480px) {
		padding: 16px;
	}
}

.loading,
.error {
	text-align: center;
	padding: 40px;
	color: var(--text-secondary, #b3b3b3);
}

.artist-content {
	display: flex;
	flex-direction: column;
	gap: 48px;

	@media (max-width: 768px) {
		gap: 32px;
	}

	@media (max-width: 480px) {
		gap: 24px;
	}
}

.artist-header {
	display: flex;
	gap: 30px;
	align-items: center;

	@media (max-width: 480px) {
		gap: 20px;
	}
}

.artist-cover-wrap {
	width: 200px;
	height: 200px;
	border-radius: 50%;
	overflow: hidden;
	flex-shrink: 0;
	display: flex;
	align-items: center;
	justify-content: center;

	&.blur {
		.artist-cover-img {
			filter: blur(10px);
		}
	}

	:deep(img) {
		width: 100%;
		height: 100%;
		object-fit: cover;
		border-radius: 50%;
	}

	@media (max-width: 480px) {
		width: 120px;
		height: 120px;
	}
}

.artist-cover-img {
	width: 100%;
	height: 100%;
	object-fit: cover;
	border-radius: 50%;
}

.artist-info {
	display: flex;
	flex-direction: column;
	gap: 16px;
	min-width: 0;
}

.artist-name {
	font-size: 36px;
	font-weight: 700;
	margin: 0;
	color: var(--text, #fff);
	letter-spacing: -0.5px;

	@media (max-width: 768px) {
		font-size: 28px;
	}

	@media (max-width: 480px) {
		font-size: 22px;
	}
}

.follow-button {
	padding: 10px 20px;
	background: var(--bg-tertiary, #2a2a2a);
	color: var(--text, #fff);
	border: none;
	border-radius: 8px;
	cursor: pointer;
	width: fit-content;
	transition: opacity 0.2s ease;

	&:hover {
		opacity: 0.9;
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
}

.section-title {
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

.artists-list {
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

.collections-list {
	display: flex;
	flex-direction: column;
	gap: 32px;
}

.collection-item-title {
	margin: 0 0 16px;
	font-size: 20px;
	font-weight: 600;
	color: var(--text, #fff);

	@media (max-width: 480px) {
		font-size: 18px;
	}
}

.playlists-list {
	display: flex;
	flex-direction: row;
	column-gap: 15px;
	flex-wrap: nowrap;
	padding-bottom: 15px;
	overflow-x: auto;
}

:deep(.song-list) {
	background: var(--bg-secondary, #181818);
	border-radius: 8px;
	overflow: hidden;
}
</style>

