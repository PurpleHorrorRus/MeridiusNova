<template>
	<div class="page" id="discover-index">
		<div v-if="loading" class="loading">
			<LoadingSpinner />
		</div>

		<div v-else-if="error" class="error">
			{{ error }}
		</div>

		<div v-else-if="data" class="content">
			<div v-if="data.albums && data.albums.length > 0" class="section">
				<h2>Новые альбомы</h2>
				<div class="albums-grid">
					<AlbumCard
						v-for="album in data.albums"
						:key="album.raw_id || `${album.owner_id}-${album.playlist_id}`"
						:album="album"
						:show-play-button="true"
					/>
				</div>
			</div>

			<div v-if="data.artists && data.artists.length > 0" class="section">
				<h2>Новые исполнители</h2>
				<div class="songs-list">
					<Song
						v-for="audio in data.artists"
						:key="audio.full_id"
						:audio="audio"
					/>
				</div>
			</div>

			<div v-if="data.releases && data.releases.length > 0" class="section">
				<h2>Новые релизы</h2>
				<div class="songs-list">
					<Song
						v-for="audio in data.releases"
						:key="audio.full_id"
						:audio="audio"
					/>
				</div>
			</div>

			<div v-if="data.chart && data.chart.length > 0" class="section">
				<h2>Чарт</h2>
				<div class="songs-list">
					<Song
						v-for="audio in data.chart"
						:key="audio.full_id"
						:audio="audio"
					/>
				</div>
			</div>

			<div v-if="data.playlists && data.playlists.length > 0" class="section">
				<h2>Плейлисты</h2>
				<div class="playlists-grid">
					<div
						v-for="collection in data.playlists"
						:key="collection.title"
						class="collection"
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
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { TExploreData } from "~~/server/utils/types";

const { data, pending: loading, error } = await useFetch<TExploreData>("api/vk/explore");
</script>

<style scoped lang="scss">
.page {
	padding: 24px 32px;
}

.loading,
.error {
	text-align: center;
	padding: 40px;
}

.content {
	display: flex;
	flex-direction: column;
	gap: 40px;
}

.section {
	h2 {
		margin-bottom: 20px;
		font-size: 24px;
	}
}

.albums-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
	gap: 20px;
}

.album-item {
	display: flex;
	flex-direction: column;
	gap: 10px;
	cursor: pointer;
	transition: transform 0.2s;

	&:hover {
		transform: scale(1.05);
	}
}

.album-cover {
	width: 100%;
	aspect-ratio: 1;
	object-fit: cover;
	border-radius: 8px;
}

.album-info {
	display: flex;
	flex-direction: column;
	gap: 5px;
}

.album-title {
	font-weight: 600;
}

.album-year {
	font-size: 12px;
	color: #666;
}

.songs-list {
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.playlists-grid {
	display: flex;
	flex-direction: column;
	gap: 30px;
}

.collection {
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
</style>

