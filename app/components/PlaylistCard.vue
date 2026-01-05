<template>
	<div class="playlist-card" @click="handleClick">
		<div class="playlist-card-cover">
			<Cover
				:src="playlist.cover_url"
				:width="coverSize"
				:height="coverSize"
			/>
			<div v-if="showPlayButton" class="playlist-card-overlay">
				<button class="playlist-card-play-button" @click.stop="(event) => handlePlayPause(event)" :disabled="isLoading">
					<Icon :name="isLoading ? 'mdi:loading' : (isPlaying ? 'mdi:pause' : 'mdi:play')" size="32" :class="{ 'loading-icon': isLoading }" />
				</button>
			</div>
		</div>

		<div class="playlist-card-info">
			<div class="playlist-card-title" :title="playlist.title">
				{{ playlist.title }}
			</div>

			<div v-if="playlist.description" class="playlist-card-description">
				{{ playlist.description }}
			</div>

			<div v-if="playlist.size !== undefined && playlist.size > 0" class="playlist-card-meta">
				{{ playlist.size }} треков
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { TPlaylist } from "~~/server/utils/types";

const props = defineProps<{
	playlist: TPlaylist;
	showPlayButton?: boolean;
}>();

const emit = defineEmits<{
	click: [playlist: TPlaylist];
	play: [playlist: TPlaylist];
}>();

const { isPlaying, isLoading, handlePlayPause: handlePlayPauseBase } = usePlaylistButton(props.playlist);

const coverSize = computed(() => {
	if (typeof window === "undefined") {
		return 160;
	}
	const width = window.innerWidth;
	if (width <= 480) {
		return 120;
	}
	if (width <= 768) {
		return 140;
	}
	return 160;
});

const handleClick = () => {
	emit("click", props.playlist);
	navigateTo(`/playlist/${props.playlist.owner_id}/${props.playlist.playlist_id}`);
};

const handlePlayPause = async (event?: MouseEvent) => {
	emit("play", props.playlist);
	await handlePlayPauseBase(event);
};
</script>

<style scoped lang="scss">
.playlist-card {
	cursor: pointer;
	transition: background-color 0.2s ease;
	padding: 8px;
	border-radius: 8px;
	background: transparent;

	&:hover {
		background: var(--bg-secondary, #181818);

		.playlist-card-cover::after {
			opacity: 1;
		}

		.playlist-card-overlay {
			opacity: 1;
		}
	}

	&-cover {
		position: relative;
		border-radius: 8px;
		overflow: hidden;
		margin-bottom: 14px;
		aspect-ratio: 1;
		width: 100%;
		background: var(--bg-secondary, #181818);

		&::after {
			content: "";
			position: absolute;
			top: -4px;
			left: -4px;
			right: -4px;
			bottom: -4px;
			border-radius: 8px;
			opacity: 0.2;
			transition: opacity 0.2s ease;
			pointer-events: none;
			z-index: 1;
			background: radial-gradient(ellipse at center, rgba(0, 0, 0, 0.2) 0%, transparent 70%);
		}

		&:hover::after {
			opacity: 0.4;
		}

		@media (max-width: 480px) {
			margin-bottom: 10px;
		}
	}

	&-overlay {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		opacity: 0;
		transition: opacity 0.2s ease;
		z-index: 1;
	}

	&-play-button {
		position: relative;
		background: var(--secondary, #e9003f);
		border: none;
		border-radius: 50%;
		width: 60px;
		height: 60px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
		cursor: pointer;
		transition: background-color 0.2s ease;
		overflow: visible;

		&::before {
			content: "";
			position: absolute;
			top: -4px;
			left: -4px;
			right: -4px;
			bottom: -4px;
			border-radius: 50%;
			background: rgba(233, 0, 63, 0.4);
			opacity: 1;
			transition: opacity 0.2s ease;
			pointer-events: none;
			z-index: -1;
		}

		@media (max-width: 480px) {
			width: 52px;
			height: 52px;

			:deep(svg) {
				width: 26px;
				height: 26px;
			}
		}

		:deep(svg) {
			margin-left: 2px;
		}

		&:hover:not(:disabled) {
			background: var(--primary-hover, #ff1a5c);

			&::before {
				opacity: 1.25;
			}
		}

		&:active:not(:disabled) {
			opacity: 0.9;
		}

		&:disabled {
			cursor: not-allowed;
			opacity: 0.7;
		}

		.loading-icon {
			animation: spin 1s linear infinite;
			will-change: transform;
		}
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	&-info {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 0 2px;
	}

	&-title {
		font-weight: 600;
		font-size: 15px;
		color: var(--text, #ffffff);
		line-height: 1.3;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		text-overflow: ellipsis;
		transition: color 0.2s ease;

		@media (max-width: 768px) {
			font-size: 14px;
		}

		@media (max-width: 480px) {
			font-size: 13px;
			-webkit-line-clamp: 1;
		}
	}

	&:hover &-title {
		color: var(--text, #ffffff);
	}

	&-description {
		font-size: 13px;
		color: var(--text-secondary, #b3b3b3);
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		line-height: 1.4;

		@media (max-width: 768px) {
			font-size: 12px;
		}

		@media (max-width: 480px) {
			font-size: 11px;
			-webkit-line-clamp: 1;
		}
	}

	&-meta {
		font-size: 13px;
		color: var(--text-tertiary, #6b6b6b);
		font-weight: 400;
		margin-top: 2px;

		@media (max-width: 768px) {
			font-size: 12px;
		}

		@media (max-width: 480px) {
			font-size: 11px;
		}
	}
}
</style>

