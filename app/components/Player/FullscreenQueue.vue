<template>
	<Transition name="queue-slide" :duration="150">
		<div v-if="showQueue && songsCount > 0" class="fullscreen-queue-section fullscreen-queue">
			<div class="fullscreen-queue-header">
				<h2 class="fullscreen-queue-title">Очередь проигрывания</h2>
				<button
					class="fullscreen-queue-close"
					@click.stop="$emit('toggleQueue')"
				>
					<Icon name="mdi:close" size="24" />
				</button>
			</div>

			<div v-if="songsCount === 0" class="fullscreen-queue-empty">
				<Icon name="mdi:playlist-music-outline" size="64" />
				<p>Очередь пуста</p>
			</div>

			<div v-else class="fullscreen-queue-content">
				<div
					v-if="playlistSource.title"
					class="fullscreen-queue-current-playlist"
					:class="{ 'fullscreen-queue-current-playlist-clickable': playlistSource.canNavigate }"
					@click="handleQueueCoverClick"
				>
					<div class="fullscreen-queue-current-cover">
						<img
							:src="queueCurrentPlaylist?.cover_url || '/no-cover.webp'"
							:alt="playlistSource.title"
							class="fullscreen-queue-current-cover-image"
						/>
					</div>
					<div class="fullscreen-queue-current-info">
						<div class="fullscreen-queue-current-title" v-text="playlistSource.title" />
						<div v-if="playlistSource.description" class="fullscreen-queue-current-description" v-text="playlistSource.description" />
						<div class="fullscreen-queue-current-meta">
							<span v-if="queueCurrentPlaylist?.author" class="fullscreen-queue-current-author" v-text="queueCurrentPlaylist.author.name" />
							<span v-if="songsCount > 0" class="fullscreen-queue-current-size">
								{{ songsCount }} треков
							</span>
							<span v-if="queueCurrentPlaylist?.listens && queueCurrentPlaylist.listens > 0" class="fullscreen-queue-current-listens">
								{{ playlistStore.formatListens(queueCurrentPlaylist.listens) }} прослушиваний
							</span>
						</div>
					</div>
				</div>

				<div ref="tracksContainerRef" class="fullscreen-queue-tracks">
					<VirtualSongList
						:items="playingSongs"
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
									:class="{ 'fullscreen-queue-track-active': (startIndex + relativeIndex) === currentIndex }"
									@click="playFromQueue(audio, startIndex + relativeIndex)"
								/>
							</VirtualSongItem>
						</template>
					</VirtualSongList>
				</div>
			</div>
		</div>
	</Transition>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { usePlaylistStore } from "~/stores/playlist";
import { usePlayerStore } from "~/stores/player";
import { useQueueScroll } from "~/utils/queue-scroll";
import { storeToRefs } from "pinia";
import Song from "~/components/Song/Song.vue";
import VirtualSongList from "~/components/VirtualSongList.vue";
import VirtualSongItem from "~/components/VirtualSongItem.vue";
import type { TAudio } from "~~/server/api/vk/audio/types";

const playlistStore = usePlaylistStore();
const playerStore = usePlayerStore();
const { currentPlaylist: queueCurrentPlaylist, playlistSource } = storeToRefs(playlistStore);

const props = defineProps<{
	showQueue: boolean;
	songsCount: number;
	playingSongs: TAudio[];
	currentIndex: number;
}>();

const emit = defineEmits<{
	toggleQueue: [];
}>();

const tracksContainerRef = ref<HTMLElement | null>(null);
const virtualListRef = ref<InstanceType<typeof VirtualSongList> | null>(null);
const showQueueRef = computed(() => props.showQueue);

useQueueScroll(
	tracksContainerRef,
	() => props.currentIndex,
	showQueueRef,
	virtualListRef
);

const handleQueueCoverClick = () => {
	if (!playlistSource.value.canNavigate || !playlistSource.value.link) {
		return;
	}

	navigateTo(playlistSource.value.link);
	emit("toggleQueue");
};

const playFromQueue = async (audio: TAudio, index: number) => {
	playlistStore.setCurrentIndex(index);
	const songFromQueue = playlistStore.playingSongs[index];
	if (songFromQueue) {
		await playerStore.play(songFromQueue);
	}
};
</script>

<style scoped lang="scss">
.fullscreen-queue-section {
	position: fixed;
	bottom: 0;
	left: 0;
	right: 0;
	height: 60%;
	max-height: 600px;
	background: rgba(0, 0, 0, 0.85);
	border-top: 1px solid rgba(255, 255, 255, 0.1);

	display: flex;
	flex-direction: column;
	overflow: hidden;
	z-index: 10001;
	padding-bottom: env(safe-area-inset-bottom, 0);

	@media (max-width: 768px) {
		height: 70%;
		max-height: none;
	}

	@media (max-width: 480px) {
		height: 75%;
	}
}

.fullscreen-queue-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 20px 24px;
	border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	gap: 12px;
	flex-shrink: 0;

	@media (max-width: 768px) {
		padding: 16px 20px;
	}

	@media (max-width: 480px) {
		padding: 12px 16px;
	}
}

.fullscreen-queue-title {
	font-size: 20px;
	font-weight: 700;
	margin: 0;
	color: #fff;

	@media (max-width: 768px) {
		font-size: 18px;
	}

	@media (max-width: 480px) {
		font-size: 16px;
	}
}

.fullscreen-queue-close {
	background: none;
	border: none;
	color: rgba(255, 255, 255, 0.7);
	cursor: pointer;
	padding: 8px;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 50%;
	transition: background-color 0.2s, color 0.2s;

	&:hover {
		background: rgba(255, 255, 255, 0.1);
		color: #fff;
	}
}

.fullscreen-queue-empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	flex: 1;
	gap: 16px;
	color: rgba(255, 255, 255, 0.5);

	:deep(svg) {
		opacity: 0.5;
	}

	p {
		font-size: 16px;
		margin: 0;
	}
}

.fullscreen-queue-content {
	display: flex;
	flex-direction: column;
	flex: 1;
	overflow: hidden;
}

.fullscreen-queue-current-playlist {
	display: flex;
	align-items: center;
	gap: 16px;
	padding: 16px 24px;
	border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	background: rgba(255, 255, 255, 0.05);
	transition: background 0.2s;
	flex-shrink: 0;

	@media (max-width: 768px) {
		padding: 12px 20px;
		gap: 12px;
	}

	@media (max-width: 480px) {
		padding: 10px 16px;
		gap: 10px;
	}

	&.fullscreen-queue-current-playlist-clickable {
		cursor: pointer;

		&:hover {
			background: rgba(255, 255, 255, 0.1);
		}
	}
}

.fullscreen-queue-current-cover {
	width: 64px;
	height: 64px;
	border-radius: 10px;
	overflow: hidden;
	flex-shrink: 0;
	transition: transform 0.2s;
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);

	@media (max-width: 480px) {
		width: 56px;
		height: 56px;
		border-radius: 8px;
	}

	.fullscreen-queue-current-playlist:hover & {
		transform: scale(1.05);
	}
}

.fullscreen-queue-current-cover-image {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.fullscreen-queue-current-info {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.fullscreen-queue-current-title {
	font-size: 14px;
	font-weight: 600;
	color: #fff;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;

	@media (max-width: 480px) {
		font-size: 13px;
	}
}

.fullscreen-queue-current-description {
	font-size: 12px;
	color: rgba(255, 255, 255, 0.6);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;

	@media (max-width: 480px) {
		font-size: 11px;
	}
}

.fullscreen-queue-current-meta {
	display: flex;
	align-items: center;
	gap: 6px;
	font-size: 11px;
	color: rgba(255, 255, 255, 0.5);
	flex-wrap: wrap;

	@media (max-width: 480px) {
		font-size: 10px;
		gap: 4px;
	}
}

.fullscreen-queue-current-author {
	font-weight: 600;
	color: rgba(255, 255, 255, 0.8);
}

.fullscreen-queue-current-size,
.fullscreen-queue-current-listens {
	&::before {
		content: "•";
		margin: 0 4px;
	}

	@media (max-width: 480px) {
		&::before {
			margin: 0 2px;
		}
	}
}

.fullscreen-queue-tracks {
	flex: 1;
	overflow-y: auto;
	padding: 0;

	&::-webkit-scrollbar {
		width: 6px;
	}

	&::-webkit-scrollbar-track {
		background: rgba(255, 255, 255, 0.05);
		border-radius: 3px;
	}

	&::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.2);
		border-radius: 3px;

		&:hover {
			background: rgba(255, 255, 255, 0.3);
		}
	}

	:deep(.song) {
		background: transparent;
		padding: 10px 24px;
		border-radius: 0;
		margin: 0;
		min-height: 56px;

		@media (max-width: 768px) {
			padding: 8px 20px;
			min-height: 52px;
		}

		@media (max-width: 480px) {
			padding: 6px 16px;
			min-height: 48px;
		}

		&:hover {
			background: rgba(255, 255, 255, 0.05);
		}

		&.playing {
			background: var(--active, rgba(233, 0, 63, 0.1));
		}

		.song-cover {
			width: 50px;
			height: 50px;

			@media (max-width: 768px) {
				width: 45px;
				height: 45px;
			}

			@media (max-width: 480px) {
				width: 40px;
				height: 40px;
			}
		}

		.song-info-title {
			font-size: 14px;

			@media (max-width: 768px) {
				font-size: 13px;
			}

			@media (max-width: 480px) {
				font-size: 12px;
			}
		}

		.song-info-artist {
			font-size: 13px;

			@media (max-width: 768px) {
				font-size: 12px;
			}

			@media (max-width: 480px) {
				font-size: 11px;
			}
		}

		.song-duration {
			font-size: 13px;

			@media (max-width: 768px) {
				font-size: 12px;
			}

			@media (max-width: 480px) {
				font-size: 11px;
			}
		}
	}
}

.fullscreen-queue-track-active {
	background: var(--active, rgba(233, 0, 63, 0.1));
}

.queue-slide-enter-active {
	transition: transform 0.15s cubic-bezier(0.4, 0, 0.2, 1);
}

.queue-slide-leave-active {
	transition: transform 0.15s cubic-bezier(0.4, 0, 0.2, 1);
}

.queue-slide-enter-from {
	transform: translateY(100%);
}

.queue-slide-enter-to {
	transform: translateY(0);
}

.queue-slide-leave-from {
	transform: translateY(0);
}

.queue-slide-leave-to {
	transform: translateY(100%);
}
</style>

