<template>
	<div class="similar-tracks-page">
		<div v-if="loading" class="loading-container">
			<LoadingSpinner />
		</div>

		<div v-else-if="tracks.length > 0" class="tracks-container">
			<h1 class="page-title">Похожие треки</h1>
			<SongList :songs="tracks" :table-mode="true" />
		</div>

		<div v-else class="no-tracks">
			<p>К сожалению, мы ничего не нашли...</p>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";

import SongList from "~/components/SongList.vue";
import LoadingSpinner from "~/components/LoadingSpinner.vue";

import { useAudioStore } from "~/stores/audio";

import { createAudioFromIds } from "~/utils/audio";

import type { TAudio } from "~~/server/utils/types";

const route = useRoute();

const loading = ref(true);
const tracks = ref<TAudio[]>([]);

onMounted(async () => {
	const audioId = Number(route.params.audio_id);
	const audioOwnerId = Number(route.query.audio_owner_id) || 0;

	if (!audioId) {
		loading.value = false;
		return;
	}

	const audio = createAudioFromIds(audioId, audioOwnerId);

	const audioStore = useAudioStore();
	const result = await audioStore.getSimilarTracks(audio).catch(() => ({ audios: [] }));
	tracks.value = result.audios || [];
	loading.value = false;
});
</script>

<style scoped lang="scss">
.similar-tracks-page {
	padding: 24px;
}

.loading-container {
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: 400px;
}

.page-title {
	font-size: 28px;
	font-weight: 700;
	color: var(--text, #fff);
	margin: 0 0 24px 0;
}

.tracks-list {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.no-tracks {
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: 400px;
	color: var(--text-secondary, #b3b3b3);
	font-size: 16px;
}
</style>

