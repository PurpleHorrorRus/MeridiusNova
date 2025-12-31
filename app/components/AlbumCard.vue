<template>
	<div class="album-card" @click="handleClick">
		<div class="album-card-cover">
		<div
			:style="{
				backgroundImage: `url('${album.image || album.cover_url}')`,
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
			<div class="album-card-title" :title="album.title">
				{{ album.title }}
			</div>

			<div v-if="album.text" class="album-card-text">
				{{ album.text }}
			</div>

			<div v-if="album.subtext" class="album-card-subtext">
				{{ album.subtext }}
			</div>
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
	transition: transform 0.2s;
	display: grid;
	grid-template-rows: 175px max-content;
	grid-template-columns: 350px;

	&:hover {
		transform: translateY(-4px);

		.album-card-overlay {
			opacity: 1;
		}
	}

	&-cover {
		position: relative;
		border-radius: 4px;
		overflow: hidden;
		width: 350px;
		height: 175px;
		background-size: cover;
		background-position: center;
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
		transition: transform 0.2s;

		&:hover:not(:disabled) {
			transform: scale(1.1);
		}

		&:disabled {
			cursor: not-allowed;
			opacity: 0.7;
		}

		.loading-icon {
			animation: spin 1s linear infinite;
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
		padding: 10px 10px 0px 10px;
	}

	&-title {
		font-weight: 600;
		font-size: 13px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	&-text {
		font-size: 13px;
		color: var(--text-secondary, #666);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	&-subtext {
		font-size: 13px;
		color: var(--text-tertiary, #999);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
}
</style>

