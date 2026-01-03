<template>
	<div
		v-if="isMobile && !showQueue && songsCount > 0"
		class="fullscreen-queue-indicator"
		@click.stop="toggleQueue"
	>
		<div class="fullscreen-queue-indicator-handle"></div>
		<div class="fullscreen-queue-indicator-content">
			<div class="fullscreen-queue-indicator-cover">
				<img
					v-if="queueCurrentPlaylist?.cover_url"
					:src="queueCurrentPlaylist.cover_url"
					:alt="playlistSource.title"
					class="fullscreen-queue-indicator-cover-image"
				/>
				<Icon v-else name="mdi:playlist-music" size="20" />
			</div>
			<div class="fullscreen-queue-indicator-info">
				<div class="fullscreen-queue-indicator-title">
					{{ playlistSource.title || "Очередь воспроизведения" }}
				</div>
				<div class="fullscreen-queue-indicator-meta">
					{{ songsCount }} треков
				</div>
			</div>
			<Icon name="mdi:chevron-up" size="24" class="fullscreen-queue-indicator-icon" />
		</div>
	</div>
</template>

<script setup lang="ts">
import { useIsMobile } from "~/composables/useIsMobile";
import { useQueueInfo } from "~/composables/useQueueInfo";

const { isMobile } = useIsMobile();
const { currentPlaylist: queueCurrentPlaylist, playlistSource } = useQueueInfo();

defineProps<{
	showQueue: boolean;
	songsCount: number;
}>();

const emit = defineEmits<{
	toggleQueue: [];
}>();

const toggleQueue = () => {
	emit("toggleQueue");
};
</script>

<style scoped lang="scss">
.fullscreen-queue-indicator {
	position: fixed;
	bottom: 0;
	left: 0;
	right: 0;
	width: 100%;
	background: rgba(0, 0, 0, 0.7);
	backdrop-filter: blur(20px);
	border-top: 1px solid rgba(255, 255, 255, 0.1);
	border-radius: 20px 20px 0 0;
	cursor: pointer;
	transition: all 0.2s ease;
	z-index: 50;
	padding-bottom: env(safe-area-inset-bottom, 0);
	box-sizing: border-box;

	@media (max-width: 480px) {
		border-radius: 16px 16px 0 0;
	}
}

.fullscreen-queue-indicator-handle {
	width: 40px;
	height: 4px;
	background: rgba(255, 255, 255, 0.3);
	border-radius: 2px;
	margin: 8px auto;
	transition: background 0.2s ease;
}

.fullscreen-queue-indicator:hover .fullscreen-queue-indicator-handle {
	background: rgba(255, 255, 255, 0.5);
}

.fullscreen-queue-indicator-content {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 12px 20px 16px;
}

.fullscreen-queue-indicator-cover {
	width: 40px;
	height: 40px;
	border-radius: 8px;
	overflow: hidden;
	flex-shrink: 0;
	background: rgba(255, 255, 255, 0.1);
	display: flex;
	align-items: center;
	justify-content: center;
	color: rgba(255, 255, 255, 0.6);
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.fullscreen-queue-indicator-cover-image {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.fullscreen-queue-indicator-info {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.fullscreen-queue-indicator-title {
	font-size: 14px;
	font-weight: 600;
	color: #fff;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.fullscreen-queue-indicator-meta {
	font-size: 12px;
	color: rgba(255, 255, 255, 0.6);
}

.fullscreen-queue-indicator-icon {
	color: rgba(255, 255, 255, 0.7);
	flex-shrink: 0;
	transition: transform 0.2s ease;
}

.fullscreen-queue-indicator:hover .fullscreen-queue-indicator-icon {
	transform: translateY(-2px);
}
</style>

