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
	width: 100%;
	max-width: 100%;

	@media (max-width: 1200px) {
		gap: 16px;
	}

	@media (max-width: 1000px) {
		gap: 14px;
	}

	@media (max-width: 900px) {
		gap: 12px;
	}

	@media (max-width: 768px) {
		gap: 16px;
	}

	@media (max-width: 480px) {
		gap: 12px;
	}
}

.fullscreen-cover-adjacent {
	width: min(200px, 15vh, 15vw);
	aspect-ratio: 1;
	border-radius: 16px;
	overflow: visible;
	opacity: 0.3;
	transition: opacity 0.4s ease;
	flex-shrink: 1;
	position: relative;
	z-index: 1;

	@media (max-height: 900px) {
		width: min(175px, 14vh, 14vw);
	}

	@media (max-height: 800px) {
		width: min(150px, 12vh, 12vw);
	}

	@media (max-height: 700px) {
		width: min(125px, 11vh, 11vw);
	}

	@media (min-width: 1200px) and (max-height: 700px) {
		width: min(180px, 25vh, 25vh);
	}

	@media (max-height: 600px) {
		width: min(100px, 10vh, 10vw);
		border-radius: 12px;
	}

	@media (max-height: 500px) {
		width: min(90px, 9vh, 9vw);
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
		}

		&:active {
			opacity: 0.7;
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
	width: min(400px, 30vh, 30vw);
	aspect-ratio: 1;
	border-radius: 24px;
	overflow: hidden;
	flex-shrink: 1;
	animation: scaleIn 0.4s ease;

	&::before {
		content: "";
		position: absolute;
		top: -20px;
		left: -20px;
		right: -20px;
		bottom: -20px;
		border-radius: 24px;
		background: radial-gradient(ellipse at center, rgba(0, 0, 0, 0.5) 0%, transparent 70%);
		opacity: 1;
		pointer-events: none;
		z-index: -1;
	}

	@media (max-height: 900px) {
		width: min(350px, 28vh, 28vw);
	}

	@media (max-height: 800px) {
		width: min(300px, 25vh, 25vw);
	}

	@media (max-height: 700px) {
		width: min(250px, 22vh, 22vw);
	}

	@media (min-width: 1200px) and (max-height: 700px) {
		width: min(350px, 50vh, 50vh);
	}

	@media (max-height: 600px) {
		width: min(200px, 20vh, 20vw);
		border-radius: 20px;
	}

	@media (max-height: 500px) {
		width: min(180px, 18vh, 18vw);
		border-radius: 16px;
	}

	:global(.fullscreen-player-content.lyrics-open) & {
		width: min(300px, 28vh, 28vw);

		@media (max-height: 800px) {
			width: min(250px, 25vh, 25vw);
		}

		@media (max-height: 700px) {
			width: min(200px, 22vh, 22vw);
		}

		@media (max-height: 600px) {
			width: min(180px, 20vh, 20vw);
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
	opacity: 0.4;
	z-index: 1;
	animation: fadeIn 0.4s ease;

		&::after {
			content: "";
			position: absolute;
			top: -20%;
			left: -20%;
			right: -20%;
			bottom: -20%;
			background: inherit;
			filter: blur(40px) saturate(150%);
			pointer-events: none;
		}
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

