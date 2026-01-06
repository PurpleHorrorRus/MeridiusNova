<template>
	<div class="queue-page">
		<div class="queue-header">
			<h1 class="page-title">Очередь проигрывания</h1>
			<div class="queue-actions">
				<button
					v-if="playlistStore.playingSongs.length > 0"
					class="action-button"
					@click="clearQueue"
				>
					Очистить
				</button>
			</div>
		</div>

		<div v-if="playlistStore.playingSongs.length === 0" class="empty-queue">
			<p>Очередь пуста</p>
		</div>

		<div v-else class="queue-tracks">
			<div class="queue-tracks-header">
				<span class="tracks-header-title">Название</span>
				<span class="tracks-header-album">Альбом</span>
				<span class="tracks-header-duration">
					<Icon name="mdi:clock-outline" size="16" />
				</span>
			</div>

			<Song
				v-for="(audio, index) in playlistStore.playingSongs"
				:key="`queue-${audio.full_id}-${index}`"
				:audio="audio"
				:class="{ 'current-song': index === playlistStore.currentIndex }"
				@click="playFromQueue(audio, index)"
			/>
		</div>
	</div>
</template>

<script setup lang="ts">
import { usePlaylistStore } from "~/stores/playlist";
import { usePlayerStore } from "~/stores/player";
import type { TAudio } from "~~/server/api/vk/audio/types";

const playlistStore = usePlaylistStore();
const playerStore = usePlayerStore();

const clearQueue = () => {
	playlistStore.clear();
};

const playFromQueue = async (audio: TAudio, index: number) => {
	playlistStore.setCurrentIndex(index);
	// Используем трек из очереди, который уже имеет все данные (включая URL)
	const songFromQueue = playlistStore.playingSongs[index];
	if (songFromQueue) {
		await playerStore.play({ ...songFromQueue, manual: true });
	}
};
</script>

<style scoped lang="scss">
.queue-page {
	display: flex;
	flex-direction: column;
	min-height: 100%;
}

.queue-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 32px 32px 24px;
}

.page-title {
	font-size: 32px;
	font-weight: 700;
	margin: 0;
	color: var(--text, #fff);
}

.queue-actions {
	display: flex;
	gap: 12px;
}

.action-button {
	padding: 8px 16px;
	border: none;
	border-radius: 4px;
	background: var(--bg-secondary, #2a2a2a);
	color: var(--text, #fff);
	font-size: 14px;
	font-weight: 500;
	cursor: pointer;
	transition: background 0.2s;

	&:hover {
		background: var(--hover, #3a3a3a);
	}
}

.empty-queue {
	display: flex;
	justify-content: center;
	align-items: center;
	flex: 1;
	padding: 40px;
	color: var(--text-secondary, #b3b3b3);
	font-size: 16px;
}

.queue-tracks {
	display: flex;
	flex-direction: column;
	padding: 0 32px 32px;
}

.queue-tracks-header {
	display: grid;
	grid-template-columns: 1fr 1fr 80px;
	gap: 16px;
	padding: 8px 16px;
	border-bottom: 1px solid var(--border, #282828);
	color: var(--text-secondary, #b3b3b3);
	font-size: 12px;
	font-weight: 500;
	text-transform: uppercase;
	letter-spacing: 1px;
	position: sticky;
	top: 0;
	background: var(--bg-primary, #121212);
	z-index: 10;
}

.tracks-header-title {
	grid-column: 1;
}

.tracks-header-album {
	grid-column: 2;
}

.tracks-header-duration {
	grid-column: 3;
	text-align: center;
}

.current-song {
	background: var(--active, rgba(29, 185, 84, 0.1));
}
</style>

