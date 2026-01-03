<template>
	<div class="nav-item-subitems-wrapper">
		<div class="nav-item-subitems" :class="{ expanded: expanded && playlists.length > 0 }">
			<div class="nav-item-subitems-inner">
				<div
					v-for="playlist in playlists"
					:key="playlist.raw_id"
					class="nav-item-subitem-wrapper"
					:class="{ active: isPlaylistActive(playlist) }"
				>
					<NuxtLink
						:to="`/playlist/${playlist.owner_id}/${playlist.playlist_id}`"
						class="nav-item-subitem"
					>
						<div class="nav-item-subitem-cover" @click.stop.prevent>
							<Cover
								:src="playlist.cover_url"
								:width="32"
								:height="32"
							/>
							<button
								@click.stop.prevent="handlePlaylistPlay(playlist)"
								class="nav-item-subitem-play-button"
								:disabled="playlistLoadingStates[playlist.raw_id]"
							>
								<Icon
									:name="playlistLoadingStates[playlist.raw_id] ? 'mdi:loading' : (playlistPlayingStates[playlist.raw_id] ? 'mdi:pause' : 'mdi:play')"
									size="14"
									:class="{ 'loading-icon': playlistLoadingStates[playlist.raw_id] }"
								/>
							</button>
						</div>
						<span class="nav-item-subitem-text">{{ playlist.title }}</span>
						<div v-if="playlistPlayingStates[playlist.raw_id]" class="nav-item-subitem-playing-indicator">
							<span class="playing-bar"></span>
							<span class="playing-bar"></span>
							<span class="playing-bar"></span>
						</div>
					</NuxtLink>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { usePlaylist } from "~/composables/usePlaylist";
import { usePlayerStore } from "~/stores/player";
import Cover from "~/components/Cover.vue";

const props = defineProps<{
	expanded: boolean;
	playlists: any[];
	playlistPlayingStates: Record<string, boolean>;
	playlistLoadingStates: Record<string, boolean>;
}>();

const route = useRoute();
const { playing } = usePlaylist();
const playerStore = usePlayerStore();

const isPlaylistActive = (playlist: any): boolean => {
	const isCurrentPage = route.path.startsWith("/playlist") &&
		Number(route.params.owner_id) === playlist.owner_id &&
		Number(route.params.playlist_id) === playlist.playlist_id;
	
	const currentPlaying = playing.value;
	const isCurrentlyPlaying = Boolean(currentPlaying && 
		currentPlaying.owner_id === playlist.owner_id &&
		currentPlaying.playlist_id === playlist.playlist_id &&
		!playerStore.paused);
	
	return isCurrentPage || isCurrentlyPlaying;
};

const emit = defineEmits<{
	"playlist-play": [playlist: any];
}>();

const handlePlaylistPlay = async (playlist: any) => {
	emit("playlist-play", playlist);
};
</script>

<style scoped lang="scss">
.nav-item-subitems-wrapper {
	overflow: hidden;
}

.nav-item-subitems {
	display: grid;
	grid-template-rows: 0fr;
	transition: grid-template-rows 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1), padding 0.4s cubic-bezier(0.4, 0, 0.2, 1), margin 0.4s cubic-bezier(0.4, 0, 0.2, 1), border 0.4s cubic-bezier(0.4, 0, 0.2, 1);
	opacity: 0;
	padding-top: 0;
	padding-bottom: 0;
	margin-top: 0;
	margin-bottom: 0;
	border-top: 1px solid transparent;
	border-bottom: 1px solid transparent;

	&.expanded {
		grid-template-rows: 1fr;
		opacity: 1;
		padding-top: 8px;
		padding-bottom: 8px;
		margin-top: 4px;
		margin-bottom: 4px;
		border-top-color: var(--border, #2a2a2a);
		border-bottom-color: var(--border, #2a2a2a);
	}
}

.nav-item-subitems-inner {
	display: flex;
	flex-direction: column;
	overflow: hidden;
	overflow-y: auto;
	overflow-x: hidden;
	min-height: 0;
	max-height: calc(100vh - 550px);

	@media (max-width: 1000px) {
		max-height: calc(100vh - 530px);
	}

	@media (max-width: 800px) {
		max-height: calc(100vh - 510px);
	}

	@media (max-width: 600px) {
		max-height: calc(100vh - 490px);
	}

	&::-webkit-scrollbar {
		width: 4px;
	}

	&::-webkit-scrollbar-track {
		background: transparent;
	}

	&::-webkit-scrollbar-thumb {
		background: var(--text-tertiary, #6b6b6b);
		border-radius: 2px;

		&:hover {
			background: var(--text-secondary, #b3b3b3);
		}
	}
}

.nav-item-subitem-wrapper {
	position: relative;
	transition: all 0.2s ease;

	&.active {
		background: var(--bg-secondary, #252525);

		&::before {
			content: "";
			position: absolute;
			left: -21px;
			top: 0;
			bottom: 0;
			width: 2px;
			background: var(--secondary, #e9003f);
			border-radius: 2px 0 0 2px;
		}

		@media (max-width: 600px) {
			&::before {
				display: none;
			}

			&::after {
				content: "";
				position: absolute;
				left: 0;
				right: 0;
				top: 0;
				height: 2px;
				background: var(--secondary, #e9003f);
			}
		}
	}
}

.nav-item-subitem {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 6px 20px 6px 8px;
	color: var(--text-secondary, #b3b3b3);
	text-decoration: none;
	transition: all 0.2s ease;
	font-size: 12px;
	position: relative;
	border-radius: 4px;
	margin: 2px 4px;

	@media (max-width: 1000px) {
		padding: 3px 16px 3px 6px;
		font-size: 11px;
		gap: 6px;
	}

	@media (max-width: 800px) {
		padding: 3px 12px 3px 5px;
		font-size: 10px;
		gap: 5px;
	}

	@media (max-width: 600px) {
		padding: 6px 10px;
		justify-content: center;
		gap: 0;
	}

	.nav-item-subitem-wrapper:hover & {
		color: var(--text, #fff);
		background: var(--hover, #2a2a2a);
	}

	.nav-item-subitem-wrapper.active & {
		color: var(--secondary, #e9003f);
		background: transparent;
	}
}

.nav-item-subitem-cover {
	position: relative;
	width: 24px;
	height: 24px;
	flex-shrink: 0;
	border-radius: 3px;
	overflow: hidden;
	background: var(--bg-secondary, #1a1a1a);

	@media (max-width: 800px) {
		width: 22px;
		height: 22px;
	}

	@media (max-width: 600px) {
		display: none;
	}

	:deep(img) {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
}

.nav-item-subitem-play-button {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.6);
	border: none;
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	opacity: 0;
	transition: opacity 0.2s ease;
	color: var(--text, #fff);
	backdrop-filter: blur(2px);

	.nav-item-subitem-wrapper:hover & {
		opacity: 1;
	}

	&:hover {
		background: rgba(0, 0, 0, 0.8);
	}

	&:disabled {
		cursor: not-allowed;
		opacity: 0.7;
	}

	:deep(svg) {
		width: 12px;
		height: 12px;
	}

	.loading-icon {
		animation: spin 0.8s linear infinite;
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

.nav-item-subitem-playing-indicator {
	display: flex;
	align-items: center;
	gap: 2px;
	margin-left: auto;
	margin-right: 8px;
	height: 12px;

	@media (max-width: 600px) {
		display: none;
	}
}

.playing-bar {
	width: 3px;
	height: 100%;
	background: var(--secondary, #e9003f);
	border-radius: 2px;
	animation: playing-wave 1.2s ease-in-out infinite;

	&:nth-child(1) {
		animation-delay: 0s;
	}

	&:nth-child(2) {
		animation-delay: 0.2s;
	}

	&:nth-child(3) {
		animation-delay: 0.4s;
	}
}

@keyframes playing-wave {
	0%, 100% {
		height: 30%;
		transform: scaleY(0.3);
	}
	50% {
		height: 100%;
		transform: scaleY(1);
	}
}

.nav-item-subitem-text {
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	flex: 1;
	min-width: 0;

	@media (max-width: 600px) {
		display: none;
	}
}
</style>

