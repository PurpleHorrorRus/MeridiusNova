<template>
	<Teleport to="body">
		<Transition name="queue-drawer">
			<div
				v-if="isQueueDrawerOpen"
				class="queue-drawer-overlay"
				@click="closeQueueDrawer"
			>
				<div
					class="queue-drawer"
					@click.stop
				>
					<div class="queue-drawer-header">
						<h2 class="queue-drawer-title">Очередь проигрывания</h2>
						<div class="queue-drawer-header-actions">
							<button
								v-if="playlistStore.playingSongs.length > 0"
								class="queue-drawer-clear-button"
								@click="playlistStore.clear"
								title="Очистить очередь"
							>
								<Icon name="mdi:delete-outline" size="20" />
							</button>
							<button
								class="queue-drawer-close"
								@click="closeQueueDrawer"
							>
								<Icon name="mdi:close" size="24" />
							</button>
						</div>
					</div>

					<div v-if="playlistStore.playingSongs.length === 0" class="queue-drawer-empty">
						<Icon name="mdi:playlist-music-outline" size="64" />
						<p>Очередь пуста</p>
					</div>

					<div v-else class="queue-drawer-content">
						<div 
							v-if="playlistSource.title" 
							class="queue-drawer-current-playlist"
							:class="{ 'queue-drawer-current-playlist-clickable': playlistSource.canNavigate }"
							@click="handleCoverClick"
						>
							<div class="queue-drawer-current-cover">
								<img
									:src="currentPlaylist?.cover_url || '/no-cover.webp'"
									:alt="playlistSource.title"
									class="queue-drawer-current-cover-image"
								/>
							</div>
							<div class="queue-drawer-current-info">
								<div class="queue-drawer-current-title">{{ playlistSource.title }}</div>
								<div v-if="playlistSource.description" class="queue-drawer-current-description">{{ playlistSource.description }}</div>
								<div class="queue-drawer-current-meta">
									<span v-if="currentPlaylist?.author" class="queue-drawer-current-author">
										{{ currentPlaylist.author.name }}
									</span>
									<span v-if="playlistStore.playingSongs.length > 0" class="queue-drawer-current-size">
										{{ playlistStore.playingSongs.length }} треков
									</span>
									<span v-if="currentPlaylist?.listens && currentPlaylist.listens > 0" class="queue-drawer-current-listens">
										{{ formatListens(currentPlaylist.listens) }} прослушиваний
									</span>
								</div>
							</div>
						</div>

						<div ref="tracksContainerRef" class="queue-drawer-tracks">
							<VirtualSongList
								:items="playlistStore.playingSongs"
								:item-height="56"
								:overscan="10"
								:scroll-container="tracksContainerRef"
								ref="virtualListRef"
							>
								<template #default="{ visibleItems, startIndex }">
									<VirtualSongItem
										v-for="(audio, relativeIndex) in visibleItems"
										:key="`queue-${audio.full_id}-${startIndex + relativeIndex}`"
										:index="startIndex + relativeIndex"
										@height="(height: number) => virtualListRef?.updateItemHeight(startIndex + relativeIndex, height)"
									>
										<Song
											:audio="audio"
											:data-queue-index="startIndex + relativeIndex"
											:class="{ 'queue-drawer-track-active': (startIndex + relativeIndex) === playlistStore.currentIndex }"
											@click="playFromQueue(audio, startIndex + relativeIndex)"
										/>
									</VirtualSongItem>
								</template>
							</VirtualSongList>
						</div>
					</div>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<script setup lang="ts">
import { ref } from "vue";
import Song from "~/components/Song/Song.vue";
import VirtualSongList from "~/components/VirtualSongList.vue";
import VirtualSongItem from "~/components/VirtualSongItem.vue";
import { useQueueDrawer } from "~/composables/useQueueDrawer";
import { usePlaylistStore } from "~/stores/playlist";
import { useAudio } from "~/composables/useAudio";
import { useEventListener } from "~/composables/useEventListener";
import { useQueueInfo } from "~/composables/useQueueInfo";
import { useQueueScroll } from "~/composables/useQueueScroll";
import type { TAudio } from "~~/server/api/vk/audio/types";

const { isQueueDrawerOpen, closeQueueDrawer } = useQueueDrawer();
const playlistStore = usePlaylistStore();
const { play } = useAudio();
const { currentPlaylist, playlistSource, formatListens } = useQueueInfo();

const tracksContainerRef = ref<HTMLElement | null>(null);
const virtualListRef = ref<InstanceType<typeof VirtualSongList> | null>(null);

// Скроллим к текущему треку при изменении индекса
useQueueScroll(
	tracksContainerRef,
	() => playlistStore.currentIndex,
	isQueueDrawerOpen,
	virtualListRef
);

const playFromQueue = async (audio: TAudio, index: number) => {
	playlistStore.setCurrentIndex(index);
	const songFromQueue = playlistStore.playingSongs[index];
	if (songFromQueue) {
		await play(songFromQueue);
	}
};

const handleCoverClick = () => {
	if (!playlistSource.value.canNavigate || !playlistSource.value.link) {
		return;
	}

	navigateTo(playlistSource.value.link);
	closeQueueDrawer();
};

const handleEscape = (event: KeyboardEvent) => {
	if (event.key === "Escape" && isQueueDrawerOpen.value) {
		closeQueueDrawer();
	}
};

useEventListener(document, "keydown", handleEscape);
</script>

<style scoped lang="scss">
.queue-drawer-overlay {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.5);
	z-index: 2000;

	backdrop-filter: blur(4px);
	display: flex;
	justify-content: flex-end;
}

.queue-drawer {
	width: 400px;
	max-width: 90vw;
	height: 100%;
	background: var(--bg-sidebar, #1a1a1a);
	border-left: 1px solid var(--border, #2a2a2a);
	display: flex;
	flex-direction: column;
	box-shadow: -4px 0 24px rgba(0, 0, 0, 0.5);

	@media (max-width: 600px) {
		width: 100%;
		max-width: 100vw;
	}
}

.queue-drawer-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 24px;
	border-bottom: 1px solid var(--border, #2a2a2a);
	gap: 12px;

	@media (max-width: 600px) {
		padding: 20px;
		gap: 8px;
	}
}

.queue-drawer-header-actions {
	display: flex;
	align-items: center;
	gap: 8px;
}

.queue-drawer-title {
	font-size: 24px;
	font-weight: 700;
	margin: 0;
	color: var(--text, #fff);

	@media (max-width: 600px) {
		font-size: 20px;
	}
}

.queue-drawer-clear-button {
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

.queue-drawer-close {
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

.queue-drawer-empty {
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

.queue-drawer-content {
	display: flex;
	flex-direction: column;
	flex: 1;
	overflow: hidden;
}

.queue-drawer-current-playlist {
	display: flex;
	align-items: center;
	gap: 16px;
	padding: 20px 24px;
	border-bottom: 1px solid var(--border, #2a2a2a);
	background: var(--bg-secondary, #1f1f1f);
	transition: background 0.2s;

	@media (max-width: 600px) {
		padding: 16px 20px;
		gap: 12px;
	}

	&.queue-drawer-current-playlist-clickable {
		cursor: pointer;

		&:hover {
			background: var(--hover, #2a2a2a);
		}
	}
}

.queue-drawer-current-cover {
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

	.queue-drawer-current-playlist:hover & {
		transform: scale(1.05);
	}
}

.queue-drawer-current-cover-image {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.queue-drawer-current-info {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.queue-drawer-current-title {
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

.queue-drawer-current-description {
	font-size: 14px;
	color: var(--text-secondary, #b3b3b3);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;

	@media (max-width: 600px) {
		font-size: 12px;
	}
}

.queue-drawer-current-meta {
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

.queue-drawer-current-author {
	font-weight: 600;
	color: var(--text, #fff);
}

.queue-drawer-current-size,
.queue-drawer-current-listens {
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

.queue-drawer-tracks {
	flex: 1;
	overflow-y: auto;
	padding: 8px 0;
}

.queue-drawer-track-active {
	background: var(--active, rgba(233, 0, 63, 0.1));
}

.queue-drawer-enter-active,
.queue-drawer-leave-active {
	transition: opacity 0.3s ease;
}

.queue-drawer-enter-active .queue-drawer,
.queue-drawer-leave-active .queue-drawer {
	transition: transform 0.3s ease;
}

.queue-drawer-enter-from,
.queue-drawer-leave-to {
	opacity: 0;
}

.queue-drawer-enter-from .queue-drawer,
.queue-drawer-leave-to .queue-drawer {
	transform: translateX(100%);
}
</style>

