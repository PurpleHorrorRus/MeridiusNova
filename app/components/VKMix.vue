<template>
	<div class="vk-mix" :class="{ playing: isPlaying && !paused, loading: loading }">
		<div class="vk-mix-background">
			<div class="vk-mix-accent-line"></div>
			<div class="vk-mix-shapes">
				<div class="shape shape-circle shape-1"></div>
				<div class="shape shape-circle shape-2"></div>
				<div class="shape shape-square shape-3"></div>
				<div class="shape shape-square shape-4"></div>
				<div class="shape shape-diamond shape-5"></div>
			</div>
			<div class="vk-mix-pulse"></div>
		</div>

		<button
			class="vk-mix-play-button"
			:disabled="loading"
			@click="handlePlay"
		>
			<div class="vk-mix-play-icon-wrapper">
				<Icon
					:name="isPlaying && !paused ? 'mdi:pause' : 'mdi:play'"
					size="32"
					class="vk-mix-play-icon"
				/>
			</div>
			<div class="vk-mix-play-ripple" v-if="isPlaying && !paused"></div>
		</button>

		<div class="vk-mix-info">
			<div class="vk-mix-title">{{ getString("general.vkmix.title") }}</div>
			<div class="vk-mix-description">{{ getString("general.vkmix.description") }}</div>
		</div>

		<div class="vk-mix-loading" v-if="loading">
			<div class="spinner"></div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { usePlaylistStore } from "~/stores/playlist";
import { usePlayerStore } from "~/stores/player";

import type { TVkMixResponse } from "~~/server/utils/types";

const { getString } = useStrings();
const playerStore = usePlayerStore();
const playlistStore = usePlaylistStore();

const loading = ref(false);

const isPlaying = computed(() => {
	return playlistStore.playing?.playlist_id === -9 || String(playlistStore.playing?.owner_id) === "vkmix";
});

const paused = computed(() => {
	return playerStore.paused;
});

const handlePlay = async () => {
	if (isPlaying.value) {
		if (paused.value) {
			playerStore.resume();
		} else {
			playerStore.pause();
		}
		return;
	}

	loading.value = true;

	const result = await $fetch<TVkMixResponse>("/api/vk/explore/vkmix", {
		params: playlistStore.vkMixSectionId ? { sectionId: playlistStore.vkMixSectionId } : {}
	}).catch((error) => {
		console.error("Failed to play VK Mix:", error);
		return null;
	});

	loading.value = false;

	if (!result || !result.song) {
		return;
	}

	playlistStore.setVkMixSectionId(result.sectionId);

	// Используем прямой вызов store для установки очереди
	await playlistStore.setQueue([result.song], {
		owner_id: 0,
		playlist_id: -9,
		raw_id: "vkmix_-9",
		title: getString("queue.source.vkMix"),
		cover_url: "",
		description: "",
		size: 0,
		listens: 0,
		last_updated: 0,
		explicit: false,
		followed: false,
		official: false,
		restricted: false,
		access_hash: "",
		follow_hash: "",
		edit_hash: "",
		list: [result.song]
	}, 0);

	// Добавляем информацию о VK Mix в трек
	await playerStore.play({
		...result.song,
		from: "vkmix"
	} as TAudio & { from?: string });
};
</script>

<style scoped lang="scss">
.vk-mix {
	position: relative;
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
	gap: 20px;
	width: 100%;
	height: 300px;
	background: var(--bg-secondary, #181818);
	border-radius: 16px;
	overflow: hidden;
	padding: 40px 32px;
		contain: layout style;

	&::after {
		content: "";
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		border-radius: 16px;
		opacity: 0;
		transition: opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1);
		pointer-events: none;
		z-index: -1;
		background: radial-gradient(ellipse at center, rgba(0, 0, 0, 0.2) 0%, transparent 70%);
	}

	&.playing {
		background: linear-gradient(
			135deg,
			rgba(30, 20, 40, 0.8) 0%,
			rgba(40, 25, 50, 0.9) 25%,
			rgba(35, 20, 45, 0.85) 50%,
			rgba(45, 30, 55, 0.9) 75%,
			rgba(30, 20, 40, 0.8) 100%
		);
		background-size: 200% 200%;
	}

	&:not(.playing) {
		animation: none;
	}

	&:hover {
		&::after {
			opacity: 1;
		}
	}

	&.playing {
		.vk-mix-accent-line {
			opacity: 1;
		}
	}

	&.loading {
		.vk-mix-play-button {
			opacity: 0.5;
			pointer-events: none;
		}
	}

	&-background {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		width: 100%;
		height: 100%;
		z-index: 0;
		opacity: 0;
		transition: opacity 0.6s ease;
		overflow: hidden;
		contain: layout style paint;

		.vk-mix.playing & {
			opacity: 1;
			background: 
				radial-gradient(circle at 20% 30%, rgba(233, 0, 63, 0.08) 0%, transparent 50%),
				radial-gradient(circle at 80% 70%, rgba(255, 26, 92, 0.06) 0%, transparent 50%),
				radial-gradient(circle at 50% 50%, rgba(255, 64, 129, 0.05) 0%, transparent 50%);
		}
	}

	&-accent-line {
		position: absolute;
		left: 0;
		top: 0;
		bottom: 0;
		width: 3px;
		background: linear-gradient(
			to bottom,
			transparent 0%,
			rgba(233, 0, 63, 0.3) 20%,
			rgba(233, 0, 63, 0.5) 50%,
			rgba(233, 0, 63, 0.3) 80%,
			transparent 100%
		);
		opacity: 0;
		transition: opacity 0.4s ease;

		.vk-mix.playing & {
			opacity: 1;
			animation: accentPulse 2s ease-in-out infinite;
		}
	}

	&-shapes {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		width: 100%;
		height: 100%;
		overflow: hidden;
		pointer-events: none;
	}

	.shape {
		position: absolute;
		border: 2px solid rgba(233, 0, 63, 0.25);
		opacity: 0;
		animation: none;

		.vk-mix.playing & {
			opacity: 1;
		}

		&.shape-circle {
			border-radius: 50%;

			.vk-mix.playing & {
				animation: shapeFloat 6s ease-in-out infinite;
			}
		}

		&.shape-square {
			transform: rotate(45deg);

			.vk-mix.playing & {
				animation: shapeRotate 8s linear infinite;
			}
		}

		&.shape-diamond {
			width: 0;
			height: 0;
			border: none;
			border-left: 15px solid transparent;
			border-right: 15px solid transparent;
			border-bottom: 15px solid rgba(233, 0, 63, 0.25);

			.vk-mix.playing & {
				animation: shapeBounce 4s ease-in-out infinite;
			}
		}

		&.shape-1 {
			width: 60px;
			height: 60px;
			top: 20%;
			right: 15%;
			animation-delay: 0s;
		}

		&.shape-2 {
			width: 40px;
			height: 40px;
			bottom: 25%;
			right: 25%;
			animation-delay: 1.5s;
		}

		&.shape-3 {
			width: 30px;
			height: 30px;
			top: 15%;
			left: 20%;
			animation-delay: 0.5s;
		}

		&.shape-4 {
			width: 25px;
			height: 25px;
			bottom: 20%;
			left: 15%;
			animation-delay: 2.5s;
		}

		&.shape-5 {
			top: 50%;
			right: 10%;
			animation-delay: 1s;
		}
	}

	&-pulse {
		position: absolute;
		top: 50%;
		left: 50%;
		width: 200px;
		height: 200px;
		border-radius: 50%;
		border: 1px solid rgba(233, 0, 63, 0.15);
		opacity: 0;
		transform: translate(-50%, -50%);
		transform-origin: center center;
		contain: strict;
		pointer-events: none;
		z-index: 0;
		margin: 0;
		padding: 0;
		box-sizing: border-box;

		.vk-mix.playing & {
			opacity: 1;
			animation: pulseExpand 3s ease-out infinite;
		}
	}

	&-play-button {
		position: relative;
		z-index: 2;
		width: 88px;
		height: 88px;
		border-radius: 50%;
		background: var(--bg-secondary, #2a2a2a);
		border: 2px solid rgba(255, 255, 255, 0.15);
		color: var(--text, #fff);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.3s ease, border-color 0.3s ease;
		overflow: visible;

		&::before {
			content: "";
			position: absolute;
			top: -4px;
			left: -4px;
			right: -4px;
			bottom: -4px;
			border-radius: 50%;
			background: rgba(0, 0, 0, 0.3);
			opacity: 1;
			transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
			pointer-events: none;
			z-index: -1;
		}

		.vk-mix.playing & {
			background: linear-gradient(135deg, rgba(233, 0, 63, 0.25) 0%, rgba(255, 26, 92, 0.2) 100%);
			border-color: rgba(233, 0, 63, 0.3);

			&::before {
				background: rgba(233, 0, 63, 0.2);
			}
		}

		&:hover {
			border-color: rgba(255, 255, 255, 0.25);

			&::before {
				opacity: 1.33;
			}

			.vk-mix.playing & {
				border-color: rgba(233, 0, 63, 0.4);

				&::before {
					background: rgba(233, 0, 63, 0.25);
				}
			}
		}

		&:active {
			opacity: 0.9;
		}

		&:disabled {
			opacity: 0.5;
			cursor: not-allowed;
			transform: none;
		}
	}

	&-play-icon-wrapper {
		position: relative;
		z-index: 2;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: transform 0.2s ease;
	}

	&-play-icon {
		margin-left: 2px;
	}

	&-play-ripple {
		position: absolute;
		top: -20px;
		left: -20px;
		right: -20px;
		bottom: -20px;
		border-radius: 50%;
		border: 1px solid rgba(255, 255, 255, 0.1);
		animation: none;

		.vk-mix.playing & {
			animation: ripple 2s ease-out infinite;
		}
	}

	&-info {
		position: relative;
		z-index: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 10px;
		text-align: center;
		opacity: 0;
		animation: fadeInUp 0.6s ease-out forwards;
	}

	&-title {
		font-size: 28px;
		font-weight: 700;
		color: var(--text, #fff);
		letter-spacing: -0.5px;
		text-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
		transition: color 0.3s ease;

		.vk-mix.playing & {
			color: #fff;
		}
	}

	&-description {
		font-size: 15px;
		color: var(--text-secondary, #b3b3b3);
		letter-spacing: 0.2px;
		// Анимируем только color
		transition: color 0.3s ease;

		.vk-mix.playing & {
			color: rgba(255, 255, 255, 0.85);
		}
	}

	&-loading {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 3;
		background: rgba(0, 0, 0, 0.3);
		border-radius: 16px;

		&::before {
			content: "";
			position: absolute;
			top: 0;
			left: 0;
			right: 0;
			bottom: 0;
			background: rgba(0, 0, 0, 0.2);
			filter: blur(4px);
			pointer-events: none;
		}
	}

	.spinner {
		width: 40px;
		height: 40px;
		border: 3px solid rgba(255, 255, 255, 0.2);
		border-top-color: var(--secondary, #e9003f);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
		will-change: transform;
	}

	&:not(.loading) .spinner {
		animation: none;
	}
}

@keyframes accentPulse {
	0%, 100% {
		opacity: 0.6;
	}

	50% {
		opacity: 1;
	}
}

@keyframes shapeFloat {
	0%, 100% {
		transform: translate(0, 0);
		opacity: 0.3;
	}

	50% {
		transform: translate(15px, -20px);
		opacity: 0.5;
	}
}

@keyframes shapeRotate {
	0% {
		transform: rotate(45deg) translate(0, 0);
		opacity: 0.25;
	}

	50% {
		transform: rotate(225deg) translate(0, -15px);
		opacity: 0.4;
	}

	100% {
		transform: rotate(405deg) translate(0, 0);
		opacity: 0.25;
	}
}

@keyframes shapeBounce {
	0%, 100% {
		transform: translate(0, 0) rotate(0deg);
		opacity: 0.3;
	}

	50% {
		transform: translate(0, -25px) rotate(180deg);
		opacity: 0.5;
	}
}

@keyframes pulseExpand {
	0% {
		transform: translate(-50%, -50%) scale(0.8);
		opacity: 0.5;
	}

	50% {
		opacity: 0.3;
	}

	100% {
		transform: translate(-50%, -50%) scale(1.5);
		opacity: 0;
	}
}


@keyframes ripple {
	0% {
		transform: scale(0.8);
		opacity: 1;
	}

	100% {
		transform: scale(1.4);
		opacity: 0;
	}
}

@keyframes fadeInUp {
	from {
		opacity: 0;
	}

	to {
		opacity: 1;
	}
}

@keyframes spin {
	to {
		transform: rotate(360deg);
	}
}
</style>

