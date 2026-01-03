<template>
	<div class="fullscreen-covers-wrapper">
		<div 
			v-if="previousSong"
			class="fullscreen-cover-adjacent fullscreen-cover-previous"
			:class="{ clickable: hasPrevious }"
			@click.stop="handlePreviousClick"
		>
			<img
				:src="previousSong.cover || previousSong.coverUrl_p || '/no-cover.webp'"
				:alt="previousSong.title || ''"
				class="fullscreen-cover-adjacent-image"
			/>
		</div>
		
		<div class="fullscreen-cover" :key="currentSong?.full_id || currentSong?.id">
			<img
				:src="currentSong?.cover || currentSong?.coverUrl_p || '/no-cover.webp'"
				:alt="currentSong?.title || ''"
				class="fullscreen-cover-image"
			/>
			<div 
				class="fullscreen-cover-glow" 
				:style="{ backgroundImage: `url(${currentSong?.cover || currentSong?.coverUrl_p || '/no-cover.webp'})` }"
			></div>
		</div>
		
		<div 
			v-if="nextSong"
			class="fullscreen-cover-adjacent fullscreen-cover-next"
			:class="{ clickable: hasNext }"
			@click.stop="handleNextClick"
		>
			<img
				:src="nextSong.cover || nextSong.coverUrl_p || '/no-cover.webp'"
				:alt="nextSong.title || ''"
				class="fullscreen-cover-adjacent-image"
			/>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { TAudio } from "~~/server/api/vk/audio/types";

const props = defineProps<{
	currentSong: TAudio | null;
	previousSong: TAudio | null;
	nextSong: TAudio | null;
	hasPrevious: boolean;
	hasNext: boolean;
}>();

const emit = defineEmits<{
	playPrevious: [];
	playNext: [];
}>();

const handlePreviousClick = () => {
	if (props.hasPrevious) {
		emit("playPrevious");
	}
};

const handleNextClick = () => {
	if (props.hasNext) {
		emit("playNext");
	}
};
</script>

<style scoped lang="scss">
.fullscreen-covers-wrapper {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 20px;
	position: relative;

	@media (max-width: 768px) {
		gap: 16px;
	}

	@media (max-width: 480px) {
		gap: 12px;
	}
}

.fullscreen-cover-adjacent {
	width: 200px;
	height: 200px;
	border-radius: 16px;
	overflow: visible;
	opacity: 0.3;
	transition: all 0.4s ease;
	flex-shrink: 0;
	position: relative;
	z-index: 1;

	@media (max-width: 768px) {
		width: 150px;
		height: 150px;
		border-radius: 12px;
	}

	@media (max-width: 480px) {
		width: 120px;
		height: 120px;
		border-radius: 10px;
	}

	:global(.fullscreen-player-content.lyrics-open) & {
		@media (max-width: 768px) {
			display: none;
		}
	}

	&.clickable {
		cursor: pointer;
		opacity: 0.5;

		&:hover {
			opacity: 0.8;
			transform: scale(1.05);
		}

		&:active {
			transform: scale(0.95);
		}
	}
}

.fullscreen-cover-adjacent-image {
	width: 100%;
	height: 100%;
	object-fit: contain;
	border-radius: 16px;

	@media (max-width: 768px) {
		border-radius: 12px;
	}

	@media (max-width: 480px) {
		border-radius: 10px;
	}
}

.fullscreen-cover {
	position: relative;
	width: 400px;
	height: 400px;
	border-radius: 24px;
	overflow: hidden;
	box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
	flex-shrink: 0;
	animation: scaleIn 0.4s ease;
	transition: all 0.4s ease;

	@media (max-width: 768px) {
		width: 300px;
		height: 300px;
		border-radius: 20px;
	}

	@media (max-width: 480px) {
		width: 240px;
		height: 240px;
		border-radius: 16px;
	}

	:global(.fullscreen-player-content.lyrics-open) & {
		width: 300px;
		height: 300px;

		@media (max-width: 768px) {
			width: 240px;
			height: 240px;
		}

		@media (max-width: 480px) {
			width: 200px;
			height: 200px;
		}
	}
}

:global(.fullscreen-fade-leave-active) .fullscreen-cover {
	animation: scaleOut 0.3s ease;
}

@keyframes scaleIn {
	from {
		transform: scale(0.8);
		opacity: 0;
	}
	to {
		transform: scale(1);
		opacity: 1;
	}
}

@keyframes scaleOut {
	from {
		transform: scale(1);
		opacity: 1;
	}
	to {
		transform: scale(0.8);
		opacity: 0;
	}
}

.fullscreen-cover-image {
	width: 100%;
	height: 100%;
	object-fit: cover;
	position: relative;
	z-index: 2;
	animation: fadeIn 0.4s ease;
}

.fullscreen-cover-glow {
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	width: 120%;
	height: 120%;
	background-size: cover;
	filter: blur(40px) saturate(150%);
	opacity: 0.4;
	z-index: 1;
	animation: fadeIn 0.4s ease;
}

@keyframes fadeIn {
	from {
		opacity: 0;
	}
	to {
		opacity: 1;
	}
}
</style>

