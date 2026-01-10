<template>
	<div v-if="currentSong" class="player-left" @click="handlePlayerAreaClick">
		<div class="cover-wrapper">
			<img
				:src="currentSong.cover || currentSong.coverUrl_p || '/no-cover.webp'"
				:alt="currentSong.title"
				class="cover-image"
			/>
			<div 
				class="cover-glow" 
				:style="{ backgroundImage: `url(${currentSong.cover || currentSong.coverUrl_p || '/no-cover.webp'})` }"
			></div>
		</div>
		
		<div class="track-info">
			<div class="track-title" :title="currentSong.title" v-text="currentSong.title" />
			<div class="track-artist" :title="currentSong.performer || currentSong.artist" v-text="currentSong.performer || currentSong.artist" />
		</div>
	</div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";

import { usePlayerStore } from "~/stores/player";

const playerStore = usePlayerStore();
const { song: currentSong } = storeToRefs(playerStore);

const props = defineProps<{
	isFullscreen: boolean;
}>();

const emit = defineEmits<{
	toggleFullscreen: [];
}>();

const handlePlayerAreaClick = (event: MouseEvent) => {
	const target = event.target as HTMLElement;
	
	// Не открываем полноэкранный режим, если клик был на кнопку
	if (target.closest("button")) {
		return;
	}
	
	// Открываем полноэкранный режим только на ПК (не на мобильных)
	if (typeof window !== "undefined" && window.innerWidth > 800) {
		if (!props.isFullscreen) {
			event.stopPropagation();
			emit("toggleFullscreen");
		}
	}
};
</script>

<style scoped lang="scss">
.player-left {
	display: flex;
	align-items: center;
	gap: 16px;
	width: 300px;
	min-width: 0;

	@media (max-width: 1400px) {
		width: 240px;
		gap: 12px;
	}

	@media (max-width: 1200px) {
		width: 200px;
		gap: 10px;
	}

	@media (max-width: 1000px) {
		width: 160px;
		gap: 8px;
	}

	@media (max-width: 800px) {
		display: none;
	}
}

.cover-wrapper {
	position: relative;
	width: 56px;
	height: 56px;
	border-radius: 12px;
	flex-shrink: 0;
	cursor: pointer;

	@media (max-width: 1200px) {
		width: 48px;
		height: 48px;
	}

	@media (max-width: 1000px) {
		width: 40px;
		height: 40px;
		border-radius: 8px;
	}

	@media (max-width: 800px) {
		width: 36px;
		height: 36px;
		border-radius: 6px;
	}

	@media (max-width: 700px) {
		width: 32px;
		height: 32px;
		border-radius: 6px;
	}

	@media (max-width: 600px) {
		width: 28px;
		height: 28px;
		border-radius: 4px;
	}
}

.cover-image {
	width: 100%;
	height: 100%;
	border-radius: inherit;
	object-fit: cover;
	position: relative;
	z-index: 2;
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
	// Убрана анимация для производительности
}

.cover-glow {
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	width: 90%;
	height: 90%;
	background-size: cover;
	filter: blur(12px) saturate(150%);
	opacity: 0.6;
	z-index: 1;
	border-radius: 50%;
	// Убрана анимация для производительности
}

.track-info {
	display: flex;
	flex-direction: column;
	gap: 4px;
	min-width: 0;
	justify-content: center;

	@media (max-width: 600px) {
		display: none;
	}
}

.track-title {
	font-size: 14px;
	font-weight: 600;
	color: #fff;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;

	@media (max-width: 1200px) {
		font-size: 13px;
	}

	@media (max-width: 1000px) {
		font-size: 12px;
	}

	@media (max-width: 800px) {
		font-size: 11px;
	}

	@media (max-width: 700px) {
		font-size: 10px;
	}
}

.track-artist {
	font-size: 13px;
	color: rgba(255, 255, 255, 0.6);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;

	@media (max-width: 1200px) {
		font-size: 12px;
	}

	@media (max-width: 1000px) {
		font-size: 11px;
	}

	@media (max-width: 800px) {
		font-size: 10px;
	}

	@media (max-width: 700px) {
		font-size: 9px;
	}
}
</style>

