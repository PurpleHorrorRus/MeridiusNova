<template>
	<div class="skeleton-container">
		<!-- Recommendations skeleton -->
		<div class="skeleton-section">
			<SkeletonSectionTitle />
			<div class="skeleton-playlists-grid">
				<SkeletonPlaylistCard v-for="i in 6" :key="i" />
			</div>
		</div>

		<!-- VK Mix skeleton -->
		<div class="skeleton-section">
			<SkeletonVKMix />
		</div>

		<!-- Albums skeleton -->
		<div class="skeleton-section">
			<SkeletonSectionTitle />
			<div class="skeleton-albums-list">
				<SkeletonAlbumCard v-for="i in 6" :key="i" />
			</div>
		</div>

		<!-- Artists skeleton -->
		<div class="skeleton-section">
			<SkeletonSectionTitle />
			<div class="skeleton-artists-grid">
				<SkeletonArtistCard v-for="i in 6" :key="i" />
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
// No props needed
</script>

<style scoped lang="scss">
.skeleton-container {
	display: flex;
	flex-direction: column;
	gap: 48px;
}

.skeleton-section {
	display: flex;
	flex-direction: column;
	gap: 24px;
}

.skeleton-playlists-grid {
	display: flex;
	flex-direction: row;
	column-gap: 15px;
	overflow-x: auto;
	padding-bottom: 15px;
}

.skeleton-albums-list {
	display: flex;
	flex-direction: row;
	column-gap: 15px;
	overflow-x: auto;
	padding-bottom: 15px;
}

.skeleton-artists-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
	gap: 24px;
}
</style>


