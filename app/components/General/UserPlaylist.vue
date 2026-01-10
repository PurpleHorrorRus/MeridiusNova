<template>
	<div class="user-playlist" v-if="playlist">
		<div class="user-playlist-top" :style="topStyle">
			<div class="user-playlist-top-hover">
				<button class="user-playlist-action" @click.stop="handlePlayPause" :disabled="isLoading">
					<Icon :name="isLoading ? 'mdi:loading' : (isPlaying ? 'mdi:pause' : 'mdi:play')" size="24" :class="{ 'loading-icon': isLoading }" />
				</button>
			</div>

			<div class="user-playlist-top-info">
				<span class="user-playlist-top-info-title">{{ playlist.title }}</span>
				<div v-if="playlist.owner" class="user-playlist-top-info-owner">
					<img :src="playlist.owner.avatar || playlist.owner.photo_200" class="user-playlist-top-info-owner-avatar" />
					<span class="user-playlist-top-info-owner-name">{{ playlist.owner.name }}</span>
				</div>
			</div>

			<div v-if="playlist.match" class="user-playlist-top-match">
				<span class="user-playlist-top-match-value">{{ playlist.match.value }}%</span>
				<span class="user-playlist-top-match-text">{{ playlist.match.text }}</span>
			</div>
		</div>

		<div class="user-playlist-songs">
			<Song
				v-for="(audio, index) in playlist.audios?.slice(0, 3) || []"
				:key="`user-playlist-${playlist.owner_id}-${playlist.playlist_id}-${audio?.full_id || audio?.id || index}-${index}`"
				:audio="audio"
			/>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed } from "vue";

import type { TPlaylist } from "~~/server/utils/types";
import type { TAudio } from "~~/server/api/vk/audio/types";

const props = defineProps<{
	playlist: TPlaylist & {
		owner?: {
			name: string;
			avatar?: string;
			photo_200?: string;
		};
		match?: {
			value: number;
			text: string;
		};
		audios?: TAudio[];
		background?: string;
	}
}>();

const { isPlaying, isLoading, handlePlayPause } = usePlaylistButton(props.playlist);

const topStyle = computed(() => {
	const background = props.playlist?.background;
	const coverUrl = props.playlist?.cover_url;
	const covers = props.playlist?.covers;

	const imageUrl = background || coverUrl || (covers && covers.length > 0 ? covers[0] : null);

	if (imageUrl) {
		return {
			backgroundImage: `url('${imageUrl}')`,
			backgroundSize: "cover",
			backgroundPosition: "center"
		};
	}
	return {};
});
</script>

<style scoped lang="scss">
.user-playlist {
	display: grid;
	grid-template-columns: 300px;
	grid-template-rows: 120px max-content;
	row-gap: 10px;
	flex-shrink: 0;
}

.user-playlist-top {
	position: relative;
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	padding: 10px;
	background-size: cover;
	border-radius: 8px;
	cursor: pointer;
	min-height: 120px;

	&:hover {
		.user-playlist-top-hover {
			opacity: 1;
		}
	}

	span {
		color: #ffffff !important;
		text-shadow: 1px 1px #000000;
	}
}

.user-playlist-top-hover {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	display: flex;
	justify-content: center;
	align-items: center;
	background-color: rgba(0, 0, 0, 0.75);
	border-radius: 8px;
	opacity: 0;
	transition: opacity 0.3s;
	z-index: 3;
}

.user-playlist-action {
	background: var(--secondary, #e9003f);
	border: none;
	border-radius: 50%;
	width: 48px;
	height: 48px;
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

.user-playlist-top-info {
	position: relative;
	z-index: 2;
	display: flex;
	flex-direction: column;
	gap: 8px;
	pointer-events: none;

	&-title {
		font-size: 16px;
		font-weight: bold;
	}

	&-owner {
		display: flex;
		align-items: center;
		gap: 8px;

		&-avatar {
			width: 25px;
			height: 25px;
			border-radius: 50%;
			object-fit: cover;
		}

		&-name {
			font-size: 13px;
		}
	}
}

.user-playlist-top-match {
	position: relative;
	z-index: 2;
	display: flex;
	align-items: center;
	gap: 5px;
	pointer-events: none;

	&-value {
		font-size: 20px;
		font-weight: bold;
	}

	&-text {
		font-size: 14px;
		font-weight: bold;

		&::before {
			content: "·";
			margin-right: 5px;
		}
	}
}

.user-playlist-songs {
	display: flex;
	flex-direction: column;
	gap: 0;
	background: var(--bg-secondary, #181818);
	border-radius: 8px;
	border: 1px solid var(--border, #282828);
	overflow-y: auto;
	max-height: 177px;
	cursor: pointer;

	.song {
		border-radius: 0;
	}
}
</style>

