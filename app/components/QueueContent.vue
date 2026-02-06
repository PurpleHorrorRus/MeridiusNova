<template>
	<div class="queue-content">
		<div class="queue-content-header">
			<h2 class="queue-content-title">Очередь проигрывания</h2>
			<div class="queue-content-header-actions">
				<button
					v-if="playlistStore.playingSongs.length > 0"
					class="queue-content-clear-button"
					@click="playlistStore.clear"
					title="Очистить очередь"
				>
					<Icon name="mdi:delete-outline" size="20" />
				</button>
				<button
					class="queue-content-close"
					@click="handleClose"
				>
					<Icon name="mdi:close" size="24" />
				</button>
			</div>
		</div>

		<div v-if="playlistStore.playingSongs.length === 0" class="queue-content-empty">
			<Icon name="mdi:playlist-music-outline" size="64" />
			<p>Очередь пуста</p>
		</div>

		<div v-else class="queue-content-body">
			<div 
				v-if="playlistSource.title" 
				class="queue-content-current-playlist"
				:class="{ 'queue-content-current-playlist-clickable': playlistSource.canNavigate }"
				@click="handleCoverClick"
			>
				<div class="queue-content-current-cover">
					<img
						:src="currentPlaylist?.cover_url || '/no-cover.webp'"
						:alt="playlistSource.title"
						class="queue-content-current-cover-image"
					/>
				</div>
				<div class="queue-content-current-info">
					<div class="queue-content-current-title" v-text="playlistSource.title" />
					<div v-if="playlistSource.description" class="queue-content-current-description" v-text="playlistSource.description" />
					<div class="queue-content-current-meta">
						<span v-if="currentPlaylist?.author" class="queue-content-current-author" v-text="currentPlaylist.author.name" />
						<span v-if="playlistStore.playingSongs.length > 0" class="queue-content-current-size">
							{{ playlistStore.playingSongs.length }} треков
						</span>
						<span v-if="currentPlaylist?.listens && currentPlaylist.listens > 0" class="queue-content-current-listens">
							{{ playlistStore.formatListens(currentPlaylist.listens) }} прослушиваний
						</span>
					</div>
				</div>
			</div>

			<div ref="tracksContainerRef" class="queue-content-tracks">
				<SongList
					:key="_queueVersion"
					:songs="playlistStore.playingSongs"
					:item-height="56"
					:overscan="10"
					:scroll-container="tracksContainerRef"
					virtualized
					sortable
					@sorted="playlistStore.reorderQueue"
					ref="virtualListRef"
				>
					<template #item="{ audio, index, handleClick, handleMouseDown }">
						<Song
							:audio="audio"
							:data-queue-index="index"
							:class="{ 'queue-content-track-active': index === playlistStore.currentIndex }"
							@click="handleClick(audio)"
							@mousedown="handleMouseDown"
						/>
					</template>
				</SongList>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { storeToRefs } from "pinia";

import Song from "~/components/Song/Song.vue";
import SongList from "~/components/SongList.vue";

import { usePlaylistStore } from "~/stores/playlist";

import { useQueueScroll } from "~/utils/queue-scroll";

const props = withDefaults(defineProps<{
	autoScroll?: boolean;
}>(), {
	autoScroll: false
});

const emit = defineEmits<{
	close: [];
}>();

const playlistStore = usePlaylistStore();
const { currentPlaylist, playlistSource } = storeToRefs(playlistStore);

const tracksContainerRef = ref<HTMLElement | null>(null);
const virtualListRef = ref<InstanceType<typeof SongList> | null>(null);

// Ensure queue UI updates on queueVersion changes to force reactivity after deletions
const _queueVersion = computed(() => (playlistStore as any).queueVersion ?? 0);

if (props.autoScroll) {
	useQueueScroll(
		tracksContainerRef,
		() => playlistStore.currentIndex,
		() => true,
		virtualListRef
	);
}

const handleClose = () => {
	emit("close");
};

const handleCoverClick = () => {
	if (!playlistSource.value.canNavigate || !playlistSource.value.link) {
		return;
	}

	navigateTo(playlistSource.value.link);
	emit("close");
};
</script>

<style scoped lang="scss">
.queue-content {
	display: flex;
	flex-direction: column;
	height: 100%;
	width: 100%;
}

.queue-content-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 24px;
	border-bottom: 1px solid var(--border, #2a2a2a);
	gap: 12px;
	flex-shrink: 0;

	@media (max-width: 600px) {
		padding: 20px;
		gap: 8px;
	}
}

.queue-content-header-actions {
	display: flex;
	align-items: center;
	gap: 8px;
}

.queue-content-title {
	font-size: 24px;
	font-weight: 700;
	margin: 0;
	color: var(--text, #fff);

	@media (max-width: 600px) {
		font-size: 20px;
	}
}

.queue-content-clear-button {
	background: none;
	border: none;
	color: var(--text-secondary, #b3b3b3);
	cursor: pointer;
	padding: 8px;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 50%;
	transition: background-color 0.2s, color 0.2s;

	&:hover {
		background: var(--hover, #2a2a2a);
		color: var(--text, #fff);
	}
}

.queue-content-close {
	background: none;
	border: none;
	color: var(--text-secondary, #b3b3b3);
	cursor: pointer;
	padding: 8px;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 50%;
	transition: background-color 0.2s, color 0.2s;

	&:hover {
		background: var(--hover, #2a2a2a);
		color: var(--text, #fff);
	}
}

.queue-content-empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	flex: 1;
	gap: 16px;
	color: var(--text-secondary, #b3b3b3);

	:deep(svg) {
		opacity: 0.5;
	}

	p {
		font-size: 16px;
		margin: 0;
	}
}

.queue-content-body {
	display: flex;
	flex-direction: column;
	flex: 1;
	overflow: hidden;
}

.queue-content-current-playlist {
	display: flex;
	align-items: center;
	gap: 16px;
	padding: 20px 24px;
	border-bottom: 1px solid var(--border, #2a2a2a);
	background: var(--bg-secondary, #1f1f1f);
	transition: background 0.2s;
	flex-shrink: 0;

	@media (max-width: 600px) {
		padding: 16px 20px;
		gap: 12px;
	}

	&.queue-content-current-playlist-clickable {
		cursor: pointer;

		&:hover {
			background: var(--hover, #2a2a2a);
		}
	}
}

.queue-content-current-cover {
	width: 80px;
	height: 80px;
	border-radius: 12px;
	overflow: hidden;
	flex-shrink: 0;
	transition: transform 0.2s;
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);

	@media (max-width: 600px) {
		width: 64px;
		height: 64px;
		border-radius: 10px;
	}
}

.queue-content-current-cover-image {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.queue-content-current-info {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.queue-content-current-title {
	font-size: 16px;
	font-weight: 600;
	color: var(--text, #fff);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;

	@media (max-width: 600px) {
		font-size: 14px;
	}
}

.queue-content-current-description {
	font-size: 14px;
	color: var(--text-secondary, #b3b3b3);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;

	@media (max-width: 600px) {
		font-size: 12px;
	}
}

.queue-content-current-meta {
	display: flex;
	align-items: center;
	gap: 8px;
	font-size: 12px;
	color: var(--text-secondary, #b3b3b3);
	flex-wrap: wrap;

	@media (max-width: 600px) {
		font-size: 11px;
		gap: 4px;
	}
}

.queue-content-current-author {
	font-weight: 600;
	color: var(--text, #fff);
}

.queue-content-current-size,
.queue-content-current-listens {
	&::before {
		content: "•";
		margin: 0 4px;
	}

	@media (max-width: 600px) {
		&::before {
			margin: 0 2px;
		}
	}
}

.queue-content-tracks {
	flex: 1;
	overflow-y: auto;
	padding: 8px 0;
}

.queue-content-track-active {
	background: var(--active, rgba(233, 0, 63, 0.1)) !important;
}
</style>

