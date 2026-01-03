<template>
	<div class="page" id="discover-index">
		<DiscoverNav />
		
		<div v-if="loading || !data" class="content">
			<div class="section">
				<div class="skeleton-title"></div>
				<div class="albums-grid">
					<SkeletonAlbumCard v-for="i in 6" :key="i" />
				</div>
			</div>

			<div class="section">
				<div class="skeleton-title"></div>
				<div class="songs-list">
					<SkeletonTrack v-for="i in 5" :key="i" />
				</div>
			</div>

			<div class="section">
				<div class="skeleton-title"></div>
				<div class="playlists-grid">
					<div class="collection">
						<div class="skeleton-title-small"></div>
						<div class="playlists-list">
							<SkeletonPlaylistCard v-for="i in 6" :key="i" />
						</div>
					</div>
				</div>
			</div>
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
						:key="collection.title || collection.type"
						class="collection"
					>
						<h3 v-if="collection.title">{{ collection.title }}</h3>
						<div v-if="collection.playlists && collection.playlists.length > 0" class="playlists-list">
							<PlaylistCard
								v-for="playlist in collection.playlists"
								:key="playlist.raw_id || `${playlist.owner_id}_${playlist.playlist_id}`"
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

const { data, pending: loading, error } = useLazyFetch<TExploreData>("api/vk/explore", {
	server: false
});
</script>

<style scoped lang="scss">
.page {
	padding: 24px 32px;
}

.error {
	text-align: center;
	padding: 40px;
}

.skeleton-title {
	height: 28px;
	width: 200px;
	border-radius: 4px;
	background: linear-gradient(
		90deg,
		rgba(255, 255, 255, 0.05) 0%,
		rgba(255, 255, 255, 0.1) 50%,
		rgba(255, 255, 255, 0.05) 100%
	);
	background-size: 200% 100%;
	animation: shimmer 1.5s infinite;
	margin-bottom: 20px;
}

.skeleton-title-small {
	height: 24px;
	width: 150px;
	border-radius: 4px;
	background: linear-gradient(
		90deg,
		rgba(255, 255, 255, 0.05) 0%,
		rgba(255, 255, 255, 0.1) 50%,
		rgba(255, 255, 255, 0.05) 100%
	);
	background-size: 200% 100%;
	animation: shimmer 1.5s infinite;
	margin-bottom: 15px;
}

@keyframes shimmer {
	0% {
		background-position: -200% 0;
	}
	100% {
		background-position: 200% 0;
	}
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

