<template>
	<div class="fullscreen-track-info">
		<div class="fullscreen-track-title" :title="currentSong?.title || ''">
			{{ currentSong?.title || "" }}
		</div>
		<div class="fullscreen-track-artist" :title="currentSong?.performer || currentSong?.artist || ''">
			{{ currentSong?.performer || currentSong?.artist || "" }}
		</div>
	</div>
</template>

<script setup lang="ts">
import type { TAudio } from "~~/server/api/vk/audio/types";

defineProps<{
	currentSong: TAudio | null;
}>();
</script>

<style scoped lang="scss">
.fullscreen-track-info {
	text-align: center;
	width: 100%;
	max-width: 600px;
	padding: 0 20px;
	transition: all 0.4s ease;
	margin-bottom: 0;
	box-sizing: border-box;
	height: 160px;
	display: flex;
	flex-direction: column;
	justify-content: center;

	@media (max-width: 768px) {
		max-width: 100%;
		padding: 0 16px;
		width: 100%;
		height: 140px;
	}

	@media (max-width: 480px) {
		padding: 0 12px;
		height: 120px;
	}

	:global(.fullscreen-player-content.lyrics-open) & {
		text-align: left;
		max-width: 300px;
		padding: 0;

		@media (max-width: 768px) {
			max-width: 240px;
		}

		@media (max-width: 480px) {
			max-width: 200px;
		}
	}
}

.fullscreen-track-title {
	font-size: 32px;
	font-weight: 700;
	color: #fff;
	margin-bottom: 8px;
	line-height: 1.3;
	word-wrap: break-word;
	overflow: hidden;
	text-overflow: ellipsis;
	display: -webkit-box;
	-webkit-box-orient: vertical;
	max-width: 100%;
	max-height: calc(1.3em * 3);
	-webkit-line-clamp: 3;
	line-clamp: 3;

	@media (max-width: 768px) {
		font-size: 24px;
		margin-bottom: 6px;
		max-height: calc(1.3em * 3);
		-webkit-line-clamp: 3;
		line-clamp: 3;
	}

	@media (max-width: 480px) {
		font-size: 20px;
		margin-bottom: 4px;
		max-height: calc(1.3em * 3);
		-webkit-line-clamp: 3;
		line-clamp: 3;
	}
}

.fullscreen-track-artist {
	font-size: 20px;
	color: rgba(255, 255, 255, 0.7);
	line-height: 1.4;
	word-wrap: break-word;
	overflow: hidden;
	text-overflow: ellipsis;
	display: -webkit-box;
	-webkit-line-clamp: 1;
	line-clamp: 1;
	-webkit-box-orient: vertical;
	max-width: 100%;

	@media (max-width: 768px) {
		font-size: 16px;
		-webkit-line-clamp: 1;
		line-clamp: 1;
	}

	@media (max-width: 480px) {
		font-size: 14px;
		-webkit-line-clamp: 1;
		line-clamp: 1;
	}
}
</style>

