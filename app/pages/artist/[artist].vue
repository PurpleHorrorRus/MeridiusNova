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
				<img
					v-if="current.cover.src"
					:src="current.cover.src"
					:alt="current.name"
					class="artist-cover"
					:class="{ blur: current.cover.blur }"
				/>
				<div class="artist-info">
					<h1 class="artist-name" v-text="current.name" />
					<button
						v-if="current.follow.hash"
						@click="toggleFollow"
						class="follow-button"
					>
						{{ current.follow.followed ? "Отписаться" : "Подписаться" }}
					</button>
				</div>
			</div>

			<NuxtLink v-if="current.audios && current.audios.length > 0" :to="`/artist/${artistParam}/popular`" class="popular-link">
				Популярные треки
			</NuxtLink>

			<div v-if="current.artists && current.artists.length > 0" class="section">
				<h2>Похожие исполнители</h2>
				<div class="artists-list">
					<ArtistCard
						v-for="artist in current.artists"
						:key="artist.id"
						:artist="artist"
					/>
				</div>
			</div>

			<div v-if="current.collections && current.collections.length > 0" class="section">
				<h2>Коллекции</h2>
				<div class="collections-list">
					<div
						v-for="collection in current.collections"
						:key="collection.title"
						class="collection-item"
					>
						<h3 v-text="collection.title" />
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

			<div v-if="current.audios && current.audios.length > 0" class="section">
				<h2>Треки</h2>
				<SongList
					:songs="current.audios || []"
					:virtualized="true"
					:item-height="56"
					:overscan="10"
				/>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";

import SongList from "~/components/SongList.vue";

import { useArtistsStore } from "~/stores/artists";

const route = useRoute();
const artistParam = route.params.artist as string;

const artistsStore = useArtistsStore();
const { current, loading, error: artistError } = storeToRefs(artistsStore);

onMounted(async () => {
	if (artistParam) {
		await artistsStore.loadArtist(artistParam, true);
	}
});

const toggleFollow = async () => {
	if (!current.value?.follow.hash) {
		return;
	}

	// TODO: Implement follow/unfollow API
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

.artist-content {
	display: flex;
	flex-direction: column;
	gap: 40px;
}

.artist-header {
	display: flex;
	gap: 30px;
	align-items: center;
}

.artist-cover {
	width: 200px;
	height: 200px;
	border-radius: 50%;
	object-fit: cover;

	&.blur {
		filter: blur(10px);
	}
}

.artist-info {
	display: flex;
	flex-direction: column;
	gap: 15px;
}

.artist-name {
	font-size: 36px;
	font-weight: 700;
}

.follow-button {
	padding: 10px 20px;
	background: #007bff;
	color: white;
	border: none;
	border-radius: 4px;
	cursor: pointer;
	width: fit-content;

	&:hover {
		background: #0056b3;
	}
}

.section {
	h2 {
		margin-bottom: 20px;
		font-size: 24px;
	}
}

.artists-list {
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

.artist-cover-small {
	width: 150px;
	height: 150px;
	border-radius: 50%;
	object-fit: cover;
}

.artist-name-small {
	text-align: center;
	font-size: 14px;
}

.popular-link {
	display: inline-block;
	padding: 10px 20px;
	background: #007bff;
	color: white;
	border-radius: 4px;
	text-decoration: none;
	margin-bottom: 20px;
	width: fit-content;

	&:hover {
		background: #0056b3;
	}
}

.collections-list {
	display: flex;
	flex-direction: column;
	gap: 30px;
}

.collection-item {
	h3 {
		margin-bottom: 15px;
		font-size: 20px;
	}
}

.playlists-list {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
	gap: 20px;
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

.playlist-title {
	font-weight: 600;
}

.songs-list {
	display: flex;
	flex-direction: column;
	gap: 10px;
}
</style>

