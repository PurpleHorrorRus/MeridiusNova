<template>
	<div class="vk-mix" :class="{ playing: isPlaying && !paused, loading: loading }">
		<div class="vk-mix-background">
			<div class="vk-mix-accent-line"></div>
			<div class="vk-mix-shapes" v-if="isPlaying && !paused">
				<div class="shape shape-circle shape-1"></div>
				<div class="shape shape-circle shape-2"></div>
				<div class="shape shape-square shape-3"></div>
				<div class="shape shape-square shape-4"></div>
				<div class="shape shape-diamond shape-5"></div>
			</div>
			<div class="vk-mix-pulse" v-if="isPlaying && !paused"></div>
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
import { useAudio } from "~/composables/useAudio";
import { useQueue } from "~/composables/useQueue";

import { usePlaylistStore } from "~/stores/playlist";
import { usePlayerStore } from "~/stores/player";

import type { TPlaylist, TVkMixResponse } from "~~/server/utils/types";

const { getString } = useStrings();

const { play } = useAudio();
const playerStore = usePlayerStore();
const playlistStore = usePlaylistStore();
const { setQueue } = useQueue();

const loading = ref(false);

const isPlaying = computed(() => {
	return playlistStore.playing?.playlist_id === -9 || String(playlistStore.playing?.owner_id) === "vkmix";
});

const paused = computed(() => playerStore.paused);

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

	// Используем универсальный метод для установки очереди
	setQueue([result.song], {
		owner_id: 0,
		playlist_id: -9,
		raw_id: "vkmix_-9",
		title: "VK Mix",
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
	const songWithFrom = {
		...result.song,
		from: "vkmix"
	};

	await play(songWithFrom);
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
	transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);

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
		animation: backgroundShift 15s ease-in-out infinite;
	}

	&:hover {
		transform: translateY(-2px);
		box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
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
		inset: 0;
		width: 100%;
		height: 100%;
		z-index: 0;
		opacity: 0;
		transition: opacity 0.6s ease;

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
		inset: 0;
		width: 100%;
		height: 100%;
		overflow: hidden;
		pointer-events: none;
	}

	.shape {
		position: absolute;
		border: 2px solid rgba(233, 0, 63, 0.25);
		opacity: 0;

		.vk-mix.playing & {
			opacity: 1;
		}

		&.shape-circle {
			border-radius: 50%;
			animation: shapeFloat 6s ease-in-out infinite;
		}

		&.shape-square {
			transform: rotate(45deg);
			animation: shapeRotate 8s linear infinite;
		}

		&.shape-diamond {
			width: 0;
			height: 0;
			border: none;
			border-left: 15px solid transparent;
			border-right: 15px solid transparent;
			border-bottom: 15px solid rgba(233, 0, 63, 0.25);
			animation: shapeBounce 4s ease-in-out infinite;
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
		transform: translate(-50%, -50%);
		width: 200px;
		height: 200px;
		border-radius: 50%;
		border: 1px solid rgba(233, 0, 63, 0.15);
		opacity: 0;
		animation: pulseExpand 3s ease-out infinite;

		.vk-mix.playing & {
			opacity: 1;
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
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
		overflow: visible;

		.vk-mix.playing & {
			background: linear-gradient(135deg, rgba(233, 0, 63, 0.25) 0%, rgba(255, 26, 92, 0.2) 100%);
			border-color: rgba(233, 0, 63, 0.3);
			box-shadow: 0 4px 20px rgba(233, 0, 63, 0.2);
		}

		&:hover {
			transform: scale(1.05);
			border-color: rgba(255, 255, 255, 0.25);
			box-shadow: 0 6px 24px rgba(0, 0, 0, 0.4);

			.vk-mix.playing & {
				border-color: rgba(233, 0, 63, 0.4);
				box-shadow: 0 6px 24px rgba(233, 0, 63, 0.25);
			}
		}

		&:active {
			transform: scale(0.96);
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
		filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
	}

	&-play-ripple {
		position: absolute;
		inset: -20px;
		border-radius: 50%;
		border: 1px solid rgba(255, 255, 255, 0.1);
		animation: ripple 2s ease-out infinite;
	}

	&-info {
		position: relative;
		z-index: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 10px;
		text-align: center;
		animation: fadeInUp 0.6s ease-out;
	}

	&-title {
		font-size: 28px;
		font-weight: 700;
		color: var(--text, #fff);
		letter-spacing: -0.5px;
		text-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
		transition: all 0.3s ease;

		.vk-mix.playing & {
			color: #fff;
			text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
		}
	}

	&-description {
		font-size: 15px;
		color: var(--text-secondary, #b3b3b3);
		letter-spacing: 0.2px;
		transition: all 0.3s ease;

		.vk-mix.playing & {
			color: rgba(255, 255, 255, 0.85);
		}
	}

	&-loading {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 3;
		background: rgba(0, 0, 0, 0.3);
		backdrop-filter: blur(4px);
		border-radius: 16px;
	}

	.spinner {
		width: 40px;
		height: 40px;
		border: 3px solid rgba(255, 255, 255, 0.2);
		border-top-color: var(--secondary, #e9003f);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}
}

@keyframes accentPulse {
	0%, 100% {
		opacity: 0.6;
		transform: scaleY(1);
	}

	50% {
		opacity: 1;
		transform: scaleY(1.05);
	}
}

@keyframes shapeFloat {
	0%, 100% {
		transform: translateY(0) translateX(0) scale(1);
		opacity: 0.3;
	}

	50% {
		transform: translateY(-20px) translateX(15px) scale(1.1);
		opacity: 0.5;
	}
}

@keyframes shapeRotate {
	0% {
		transform: rotate(45deg) translateY(0);
		opacity: 0.25;
	}

	50% {
		transform: rotate(225deg) translateY(-15px);
		opacity: 0.4;
	}

	100% {
		transform: rotate(405deg) translateY(0);
		opacity: 0.25;
	}
}

@keyframes shapeBounce {
	0%, 100% {
		transform: translateY(0) rotate(0deg);
		opacity: 0.3;
	}

	50% {
		transform: translateY(-25px) rotate(180deg);
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

@keyframes backgroundShift {
	0%, 100% {
		background-position: 0% 50%;
	}

	50% {
		background-position: 100% 50%;
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
		transform: translateY(10px);
	}

	to {
		opacity: 1;
		transform: translateY(0);
	}
}

@keyframes spin {
	to {
		transform: rotate(360deg);
	}
}
</style>

