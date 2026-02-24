<template>
	<div class="page" id="artists-page">
		<div v-if="loading" class="loading">
			<LoadingSpinner />
		</div>

		<div v-else-if="error" class="error">
			{{ error }}
		</div>

		<div v-else class="content">
			<h1 class="page-title">{{ getString("navigation.subscriptions") }}</h1>
			<div v-if="artists.length > 0" class="artists-grid">
				<ArtistCard
					v-for="artist in artists"
					:key="artist.id || artist.link"
					:artist="artist"
				/>
			</div>
			<div v-else class="empty">
				{{ getString("general.subscriptionsEmpty") }}
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { TArtist } from "~~/server/utils/types";

const { getString } = useStrings();

const { data: artistsData, pending: loading, error } = await useAsyncData<TArtist[]>(
	"artists-subscriptions",
	() => $fetch<TArtist[]>("/api/vk/artists/subscriptions")
);

const artists = computed(() => artistsData.value || []);
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

.empty {
	text-align: center;
	padding: 40px;
	color: var(--text-secondary, #b3b3b3);
}

.content {
	display: flex;
	flex-direction: column;
	gap: 32px;
}

.page-title {
	font-size: 32px;
	font-weight: 700;
	margin: 0;
	color: var(--text, #fff);

	@media (max-width: 768px) {
		font-size: 28px;
	}

	@media (max-width: 480px) {
		font-size: 24px;
	}
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
</style>
