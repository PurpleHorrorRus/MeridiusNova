<template>
	<div class="album-card" @click="handleClick">
		<div class="album-card-cover">
			<div
				:style="{
					backgroundImage: `url('${album.image || ''}')`,
					width: '100%',
					height: '100%',
					backgroundSize: 'cover',
					backgroundPosition: 'center'
				}"
			/>
			<div v-if="showPlayButton" class="album-card-overlay">
				<button class="album-card-play-button" @click.stop="handlePlayPause" :disabled="isLoading">
					<Icon :name="isLoading ? 'mdi:loading' : (isPlaying ? 'mdi:pause' : 'mdi:play')" size="32" :class="{ 'loading-icon': isLoading }" />
				</button>
			</div>
		</div>

		<div class="album-card-info">
			<div class="album-card-title" :title="album.title" v-once v-text="album.title" />

			<div v-if="album.text" class="album-card-text" v-once v-text="album.text" />

			<div v-if="album.subtext" class="album-card-subtext" v-once v-text="album.subtext" />
		</div>
	</div>
</template>

<script setup lang="ts">
import type { TAlbum } from "~~/server/utils/types";

const props = defineProps<{
	album: TAlbum | {
		title: string;
		text?: string;
		subtext?: string;
		image?: string;
		cover_url?: string;
		owner_id?: number;
		playlist_id?: number;
		type?: string;
	};
	showPlayButton?: boolean;
}>();

const emit = defineEmits<{
	click: [album: TAlbum | { title: string; text?: string; subtext?: string; image?: string; cover_url?: string; owner_id?: number; playlist_id?: number; type?: string; artist?: string; }];
	play: [album: TAlbum | { title: string; text?: string; subtext?: string; image?: string; cover_url?: string; owner_id?: number; playlist_id?: number; type?: string; artist?: string; }];
}>();

const handleClick = () => {
	emit("click", props.album);

	if (props.album.type === "album" && props.album.owner_id && props.album.playlist_id) {
		navigateTo(`/playlist/${props.album.owner_id}/${props.album.playlist_id}`);
	} else if (props.album.type === "artist" && "artist" in props.album) {
		navigateTo(`/artist/${props.album.artist}`);
	}
};

const albumAsPlaylist = computed(() => {
	if (props.album.type === "album" && props.album.owner_id && props.album.playlist_id) {
		return {
			owner_id: props.album.owner_id,
			playlist_id: props.album.playlist_id,
			title: props.album.title,
			cover_url: props.album.cover_url,
			image: "image" in props.album ? props.album.image : undefined,
			text: props.album.text,
			access_hash: props.album.access_hash
		};
	}
	return null;
});

const { isPlaying, isLoading, handlePlayPause: handlePlayPauseBase } = usePlaylistButton(albumAsPlaylist);

const handlePlayPause = async () => {
	emit("play", props.album);
	await handlePlayPauseBase();
};
</script>

<style scoped lang="scss">
.album-card {
	cursor: pointer;
	display: flex;
	flex-direction: column;
	width: 300px;
	flex-shrink: 0;
	padding: 0;

	@media (max-width: 768px) {
		width: 260px;
	}

	@media (max-width: 480px) {
		width: 200px;
	}

	&:hover {
		.album-card-overlay {
			opacity: 1;
		}

		.album-card-cover::after {
			opacity: 0.4;
		}
	}

	&-cover {
		position: relative;
		border-radius: 4px;
		overflow: hidden;
		width: 100%;
		aspect-ratio: 2 / 1;
		background-size: cover;
		background-position: center;

		&::after {
			content: "";
			position: absolute;
			top: -4px;
			left: -4px;
			right: -4px;
			bottom: -4px;
			border-radius: 4px;
			opacity: 0.2;
			transition: opacity 0.2s ease;
			pointer-events: none;
			z-index: 1;
			background: radial-gradient(ellipse at center, rgba(0, 0, 0, 0.2) 0%, transparent 70%);
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
		transition: opacity 0.2s;
	}

	&-play-button {
		position: relative;
		background: var(--secondary, #e9003f);
		border: none;
		border-radius: 50%;
		width: 56px;
		height: 56px;
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

		&:hover:not(:disabled) {
			background: var(--primary-hover, #ff1a5c);

			&::before {
				opacity: 1.25;
			}
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
		gap: 4px;
		padding: 10px 0 0 0;
		min-height: 56px;
	}

	&-title {
		font-weight: 600;
		font-size: 13px;
		line-height: 1.3;
		display: -webkit-box;
		-webkit-line-clamp: 1;
		-webkit-box-orient: vertical;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	&-text {
		font-size: 13px;
		line-height: 1.3;
		color: var(--text-secondary, #666);
		display: -webkit-box;
		-webkit-line-clamp: 1;
		-webkit-box-orient: vertical;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	&-subtext {
		font-size: 13px;
		line-height: 1.3;
		color: var(--text-tertiary, #999);
	}
}
</style>

