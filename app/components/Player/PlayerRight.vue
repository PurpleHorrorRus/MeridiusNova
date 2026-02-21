<template>
	<div class="player-right" @click.stop>
		<div class="speed-wrapper" @mouseenter="handleSpeedMouseEnter" @mouseleave="handleSpeedMouseLeave">
			<button class="btn-speed" :title="`${t('player.speed')}: x${playbackRate}`">
				{{ playbackRate }}x
			</button>
			
			<transition name="fade">
				<div v-if="showSpeedMenu" class="speed-menu">
					<button
						v-for="rate in SPEED_RATES"
						:key="rate"
						class="speed-item"
						:class="{ active: rate === playbackRate }"
						@click="playerStore.setPlaybackRate(rate)"
					>
						{{ rate }}x
					</button>
				</div>
			</transition>
		</div>

		<div class="player-controls-group">
			<button
				v-if="playerStore.song?.canAdd"
				class="btn-player-control"
				@click="handleAdd"
				:title="t('player.addToLibrary')"
			>
				<Icon name="mdi:heart-outline" size="20" />
			</button>

			<button
				v-else-if="playerStore.song && playlistStore.canDelete(playerStore.song, { canAdd: Boolean(playerStore.song.canAdd), canDelete: Boolean(playerStore.song.canDelete) })"
				class="btn-player-control"
				@click="handleDelete"
				:title="playerStore.song ? playlistStore.getDeleteTitle(playerStore.song) : ''"
			>
				<Icon name="mdi:heart" size="20" />
			</button>

			<button
				class="btn-player-control"
				:class="{ active: repeat }"
				@click="playlistStore.toggleRepeat"
				:title="repeat ? t('player.repeatOn') : t('player.repeat')"
			>
				<Icon name="mdi:repeat" size="20" />
			</button>

			<button
				class="btn-player-control"
				:class="{ active: shuffle }"
				@click="playlistStore.toggleShuffle"
				:title="t('player.shuffle')"
			>
				<Icon name="mdi:shuffle" size="20" />
			</button>

			<button
				class="btn-player-control btn-queue"
				:class="{ active: playerStore.isQueueDrawerOpen }"
				@click="playerStore.openQueueDrawer"
				:title="t('player.queue') || 'Очередь воспроизведения'"
			>
				<Icon name="mdi:playlist-music" size="20" />
				<span v-if="playlistStore.playingSongs.length > 0" class="queue-badge" v-text="queueTracksCountText" />
			</button>
		</div>

		<div class="volume-wrapper">
			<VolumeControl variant="player" />
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { storeToRefs } from "pinia";

import VolumeControl from "~/components/Player/VolumeControl.vue";

import { usePlaylistStore } from "~/stores/playlist";
import { usePlayerStore } from "~/stores/player";
import { useModalStore } from "~/stores/modal";

import { useStrings } from "~/composables/useStrings";

const playerStore = usePlayerStore();
const playlistStore = usePlaylistStore();
const modalStore = useModalStore();

const { playbackRate } = storeToRefs(playerStore);
const { repeat, shuffle } = storeToRefs(playlistStore);

const { getString } = useStrings();
const t = getString;

const showSpeedMenu = ref(false);
let speedMenuTimeout: NodeJS.Timeout | null = null;

const queueTracksCountText = computed(() => {
	const count = playlistStore.playingSongs.length;
	return count > 99 ? "99+" : String(count);
});

const handleSpeedMouseEnter = () => {
	if (speedMenuTimeout) {
		clearTimeout(speedMenuTimeout);
		speedMenuTimeout = null;
	}

	showSpeedMenu.value = true;
};

const handleSpeedMouseLeave = () => {
	speedMenuTimeout = setTimeout(() => {
		showSpeedMenu.value = false;
	}, 200);
};

const SPEED_RATES = Object.freeze([0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]);


const handleAdd = async () => {
	if (!playerStore.song) {
		return;
	}

	await playlistStore.addSongToLibrary(playerStore.song);
};

const handleDelete = async () => {
	if (!playerStore.song) {
		return;
	}

	await playlistStore.deleteSong(playerStore.song);
};
</script>

<style scoped lang="scss">
.player-right {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: 16px;
	width: 400px;

	@media (max-width: 800px) {
		display: none;
	}

	@media (max-width: 1400px) {
		width: 400px;
		gap: 12px;
	}

	@media (max-width: 1200px) {
		width: 380px;
		gap: 10px;
	}

	@media (max-width: 1000px) {
		width: 260px;
		gap: 8px;
	}

	@media (min-width: 801px) and (max-width: 1000px) {
		width: 380px;
		gap: 10px;
	}
}

.player-controls-group {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 8px;

	@media (max-width: 1200px) {
		gap: 6px;
	}

	@media (max-width: 1000px) {
		gap: 4px;
	}
}

.btn-player-control {
	background: none;
	border: 1px solid transparent;
	cursor: pointer;
	padding: 8px;
	display: flex;
	align-items: center;
	justify-content: center;
	color: rgba(255, 255, 255, 0.6);
	transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
	border-radius: 50%;

	@media (max-width: 1200px) {
		padding: 6px;

		:deep(svg) {
			width: 18px;
			height: 18px;
		}
	}

	@media (max-width: 1000px) {
		padding: 4px;

		:deep(svg) {
			width: 16px;
			height: 16px;
		}
	}

	&:hover:not(.active) {
		color: #fff;
		background: rgba(255, 255, 255, 0.1);
	}

	&.active {
		color: var(--secondary, #e9003f);
		background: rgba(233, 0, 63, 0.15);
	}
}

.btn-queue {
	position: relative;
}

.queue-badge {
	position: absolute;
	top: -2px;
	right: -2px;
	background: var(--secondary, #e9003f);
	color: #fff;
	font-size: 10px;
	font-weight: 600;
	padding: 2px 5px;
	border-radius: 10px;
	min-width: 18px;
	height: 18px;
	display: flex;
	align-items: center;
	justify-content: center;
	line-height: 1;
	box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);

	@media (max-width: 1200px) {
		font-size: 9px;
		padding: 1px 4px;
		min-width: 16px;
		height: 16px;
	}

	@media (max-width: 1000px) {
		font-size: 8px;
		padding: 1px 3px;
		min-width: 14px;
		height: 14px;
	}
}

.speed-wrapper {
	position: relative;
}

.btn-speed {
	background: rgba(255, 255, 255, 0.1);
	border: none;
	border-radius: 6px;
	padding: 4px 10px;
	color: rgba(255, 255, 255, 0.8);
	font-size: 12px;
	font-weight: 500;
	cursor: pointer;
	transition: background-color 0.2s ease, color 0.2s ease;

	@media (max-width: 1200px) {
		padding: 3px 8px;
		font-size: 11px;
	}

	@media (max-width: 1000px) {
		padding: 2px 6px;
		font-size: 10px;
	}

	&:hover {
		background: rgba(255, 255, 255, 0.15);
		color: #fff;
	}
}

.speed-menu {
	position: absolute;
	bottom: 100%;
	right: 0;
	margin-bottom: 12px;
	background: rgba(30, 30, 30, 0.9);
	border-radius: 12px;

	padding: 6px;
	display: flex;
	flex-direction: column;
	gap: 2px;
	box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
	border: 1px solid rgba(255, 255, 255, 0.1);
	min-width: 80px;
}

.speed-item {
	background: none;
	border: none;
	color: rgba(255, 255, 255, 0.7);
	padding: 8px 12px;
	font-size: 13px;
	cursor: pointer;
	border-radius: 6px;
	text-align: left;
	transition: background-color 0.15s ease, color 0.15s ease;

	&:hover {
		background: rgba(255, 255, 255, 0.1);
		color: #fff;
	}

	&.active {
		color: var(--secondary, #e9003f);
		background: rgba(255, 255, 255, 0.05);
	}
}

.volume-wrapper {
	display: flex;
	align-items: center;
	width: 160px;
}

.fade-enter-active,
.fade-leave-active {
	transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
	opacity: 0;
}
</style>

