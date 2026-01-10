<template>
	<div class="player-compact" @click.stop>
		<div class="compact-controls">
			<button class="btn-control-compact" @click.stop="playerStore.prev()">
				<Icon name="mdi:skip-previous" size="20" />
			</button>
			
			<button class="btn-play-compact" @click.stop="playerStore.toggle()">
				<Icon v-if="paused" name="mdi:play" size="24" />
				<Icon v-else name="mdi:pause" size="24" />
			</button>
			
			<button class="btn-control-compact" @click.stop="playerStore.next({ manual: true })">
				<Icon name="mdi:skip-next" size="20" />
			</button>
		</div>

		<div v-if="playerStore.song" class="compact-track-info">
			<div class="compact-cover">
				<img
					:src="playerStore.song.cover || playerStore.song.coverUrl_p || '/no-cover.webp'"
					:alt="playerStore.song.title"
					class="compact-cover-image"
				/>
			</div>
			<div class="compact-track-details">
				<div class="compact-artist">{{ playerStore.song.performer || playerStore.song.artist }}</div>
				<div class="compact-title">{{ playerStore.song.title }}</div>
				<div class="compact-time">
					<span class="compact-time-current">{{ playerStore.formatTime(currentTime) }}</span>
					<span class="compact-time-separator">/</span>
					<span class="compact-time-duration">{{ playerStore.formatTime(duration) }}</span>
				</div>
			</div>
		</div>

		<div class="compact-controls-group">
			<button
				v-if="songProps.hasLyrics"
				class="btn-compact-control"
				@click.stop="handleLyrics"
				:title="t('player.lyrics') || 'Текст песни'"
			>
				<Icon name="mdi:text" size="18" />
			</button>

			<button
				class="btn-compact-control"
				:class="{ active: repeat }"
				@click="playlistStore.toggleRepeat"
				:title="repeat ? t('player.repeatOn') : t('player.repeat')"
			>
				<Icon name="mdi:repeat" size="18" />
			</button>

			<button
				class="btn-compact-control"
				:class="{ active: shuffle }"
				@click="playlistStore.toggleShuffle"
				:title="t('player.shuffle')"
			>
				<Icon name="mdi:shuffle" size="18" />
			</button>

			<button
				class="btn-compact-control"
				:class="{ active: playerStore.isQueueDrawerOpen }"
				@click="playerStore.openQueueDrawer"
				:title="t('player.queue') || 'Очередь воспроизведения'"
			>
				<Icon name="mdi:playlist-music" size="18" />
			</button>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";

import { usePlaylistStore } from "~/stores/playlist";
import { usePlayerStore } from "~/stores/player";
import { useModalStore } from "~/stores/modal";

import { useStrings } from "~/composables/useStrings";

const playerStore = usePlayerStore();
const playlistStore = usePlaylistStore();
const modalStore = useModalStore();
const { paused, currentTime, duration } = storeToRefs(playerStore);
const { repeat, shuffle } = storeToRefs(playlistStore);

const { getString } = useStrings();
const t = getString;

const songProps = computed(() => {
	if (!playerStore.song) {
		return {
			hasLyrics: false
		};
	}

	return {
		hasLyrics: Boolean(playerStore.song.hasLyrics)
	};
});

const handleLyrics = () => {
	if (!playerStore.song) {
		return;
	}

	modalStore.openModal("lyrics", { audio: playerStore.song });
};
</script>

<style scoped lang="scss">
.player-compact {
	display: none;
}

@media (max-width: 800px) {
	.player-compact {
		position: relative;
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		height: 100%;
		touch-action: manipulation;
	}

	.compact-controls {
		display: flex;
		align-items: center;
		gap: 4px;
		flex-shrink: 0;
	}

	.compact-track-info {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 8px;
		min-width: 0;
	}

	.compact-cover {
		flex-shrink: 0;
		width: 32px;
		height: 32px;
		border-radius: 4px;
		overflow: hidden;
	}

	.compact-cover-image {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.compact-track-details {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.compact-artist {
		font-size: 10px;
		color: rgba(255, 255, 255, 0.6);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		line-height: 1.2;
	}

	.compact-title {
		font-size: 11px;
		font-weight: 500;
		color: #fff;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		line-height: 1.2;
	}

	.compact-time {
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 9px;
		color: rgba(255, 255, 255, 0.6);
		margin-top: 2px;
		line-height: 1.2;
	}

	.compact-time-current {
		color: rgba(255, 255, 255, 0.8);
	}

	.compact-time-separator {
		color: rgba(255, 255, 255, 0.4);
	}

	.compact-time-duration {
		color: rgba(255, 255, 255, 0.5);
	}

	.btn-control-compact {
		background: none;
		border: none;
		color: rgba(255, 255, 255, 0.7);
		cursor: pointer;
		padding: 6px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background-color 0.2s ease, color 0.2s ease;
		min-width: 32px;
		min-height: 32px;

		&:hover:not(:disabled) {
			color: #fff;
			background: rgba(255, 255, 255, 0.1);
		}

		&:disabled {
			opacity: 0.3;
			cursor: not-allowed;
		}
	}

	.btn-play-compact {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		border: 1px solid rgba(255, 255, 255, 0.2);
		background: rgba(255, 255, 255, 0.15);
		color: #fff;

		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: background-color 0.2s ease, opacity 0.2s ease;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);

		&:hover {
			background: rgba(255, 255, 255, 0.25);
		}

		&:active {
			opacity: 0.9;
		}
	}

	.compact-controls-group {
		display: flex;
		align-items: center;
		gap: 4px;
		flex-shrink: 0;
	}

	.btn-compact-control {
		background: none;
		border: none;
		color: rgba(255, 255, 255, 0.7);
		cursor: pointer;
		padding: 6px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		transition: background-color 0.2s ease, color 0.2s ease, opacity 0.2s ease;
		width: 32px;
		height: 32px;
		flex-shrink: 0;

		&:hover:not(.active) {
			color: #fff;
			background: rgba(255, 255, 255, 0.1);
		}

		&.active {
			color: var(--secondary, #e9003f);
			background: rgba(233, 0, 63, 0.15);
		}

		&:active {
			opacity: 0.8;
		}
	}
}

@media (max-width: 700px) {
	.compact-cover {
		width: 28px;
		height: 28px;
	}

	.compact-artist {
		font-size: 9px;
	}

	.compact-title {
		font-size: 10px;
	}

	.compact-time {
		font-size: 8px;
	}

	.btn-play-compact {
		width: 32px;
		height: 32px;
	}
}

@media (max-width: 600px) {
	.player-compact {
		gap: 6px;
	}

	.compact-cover {
		width: 24px;
		height: 24px;
	}

	.compact-track-info {
		gap: 6px;
	}

	.compact-artist {
		font-size: 8px;
	}

	.compact-title {
		font-size: 9px;
	}

	.compact-time {
		font-size: 7px;
	}

	.compact-controls {
		gap: 2px;
	}

	.btn-control-compact {
		min-width: 28px;
		min-height: 28px;
		padding: 4px;
	}

	.btn-play-compact {
		width: 30px;
		height: 30px;
	}
}

@media (max-width: 480px) {
	.player-compact {
		gap: 4px;
		padding: 0 4px;
	}

	.compact-controls {
		gap: 2px;
	}

	.btn-control-compact {
		min-width: 32px;
		min-height: 32px;
		padding: 6px;
	}

	.btn-play-compact {
		width: 36px;
		height: 36px;
	}

	.compact-cover {
		width: 32px;
		height: 32px;
	}

	.compact-track-details {
		gap: 1px;
	}

	.compact-artist {
		font-size: 9px;
		line-height: 1.1;
	}

	.compact-title {
		font-size: 10px;
		line-height: 1.1;
	}

	.compact-time {
		font-size: 8px;
		margin-top: 1px;
	}

	.compact-controls-group {
		gap: 2px;
	}

	.btn-compact-control {
		width: 24px;
		height: 24px;
		padding: 2px;
	}
}
</style>

