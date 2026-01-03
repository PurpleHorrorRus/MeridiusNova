<template>
	<div
		v-if="!isMobile && !showQueue && !showLyrics && songsCount > 0 && playlistSource.title"
		class="fullscreen-queue-preview"
		@click.stop="toggleQueue"
	>
		<div class="fullscreen-queue-preview-cover">
			<img
				:src="queueCurrentPlaylist?.cover_url || '/no-cover.webp'"
				:alt="playlistSource.title"
				class="fullscreen-queue-preview-cover-image"
			/>
		</div>
		<div class="fullscreen-queue-preview-info">
			<div class="fullscreen-queue-preview-title">{{ playlistSource.title }}</div>
			<div class="fullscreen-queue-preview-meta">
				<span>{{ songsCount }} треков</span>
			</div>
		</div>
		<Icon name="mdi:chevron-up" size="24" class="fullscreen-queue-preview-icon" />
	</div>
</template>

<script setup lang="ts">
import { useIsMobile } from "~/composables/useIsMobile";
import { useQueueInfo } from "~/composables/useQueueInfo";

const { isMobile } = useIsMobile();
const { currentPlaylist: queueCurrentPlaylist, playlistSource } = useQueueInfo();

defineProps<{
	showQueue: boolean;
	showLyrics: boolean;
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
.fullscreen-queue-preview {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 12px 16px;
	margin-top: 16px;
	background: rgba(255, 255, 255, 0.05);
	backdrop-filter: blur(10px);
	border-radius: 12px;
	cursor: pointer;
	transition: all 0.2s ease;
	border: 1px solid rgba(255, 255, 255, 0.1);
	width: 100%;
	max-width: 600px;
	box-sizing: border-box;

	&:hover {
		background: rgba(255, 255, 255, 0.1);
		border-color: rgba(255, 255, 255, 0.2);
		transform: translateY(-2px);
	}

	&:active {
		transform: translateY(0);
	}
}

.fullscreen-queue-preview-cover {
	width: 48px;
	height: 48px;
	border-radius: 50%;
	overflow: hidden;
	flex-shrink: 0;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.fullscreen-queue-preview-cover-image {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.fullscreen-queue-preview-info {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.fullscreen-queue-preview-title {
	font-size: 14px;
	font-weight: 600;
	color: #fff;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.fullscreen-queue-preview-meta {
	font-size: 12px;
	color: rgba(255, 255, 255, 0.6);
}

.fullscreen-queue-preview-icon {
	color: rgba(255, 255, 255, 0.7);
	flex-shrink: 0;
	transition: transform 0.2s ease;
}

.fullscreen-queue-preview:hover .fullscreen-queue-preview-icon {
	transform: translateY(-2px);
}
</style>

