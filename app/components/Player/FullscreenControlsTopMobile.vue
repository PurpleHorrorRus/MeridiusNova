<template>
	<div v-if="isMobile" class="fullscreen-controls-top-mobile">
		<div class="fullscreen-controls-left">
			<button
				v-if="songProps.canAdd"
				class="btn-fullscreen-vk"
				@click.stop="handleAdd"
				:title="t('player.addToLibrary')"
			>
				<Icon name="mdi:heart-outline" size="24" />
			</button>

			<button
				v-else-if="canDelete"
				class="btn-fullscreen-vk"
				@click.stop="handleDelete"
				:title="deleteTitle"
			>
				<Icon name="mdi:heart" size="24" />
			</button>

			<button
				v-if="songProps.hasLyrics"
				class="btn-fullscreen-vk"
				@click.stop="handleLyrics"
				:title="t('player.lyrics') || 'Текст песни'"
			>
				<Icon name="mdi:text" size="24" />
			</button>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed } from "vue";

import { usePlayerStore } from "~/stores/player";
import { usePlaylistStore } from "~/stores/playlist";
import { useModalStore } from "~/stores/modal";

import { useStrings } from "~/composables/useStrings";
import { useIsMobile } from "~/composables/useIsMobile";

const playerStore = usePlayerStore();
const playlistStore = usePlaylistStore();
const { getString } = useStrings();
const t = getString;
const modalStore = useModalStore();
const { isMobile } = useIsMobile();

const songProps = computed(() => {
	const song = playerStore.song;
	if (!song) {
		return {
			canAdd: false,
			canDelete: false,
			hasLyrics: false
		};
	}

	return {
		canAdd: Boolean(song.canAdd),
		canDelete: Boolean(song.canDelete),
		hasLyrics: Boolean(song.hasLyrics)
	};
});

const canDelete = computed(() => {
	if (!playerStore.song) {
		return false;
	}

	return playlistStore.canDelete(playerStore.song, songProps.value);
});

const deleteTitle = computed(() => {
	if (!playerStore.song) {
		return "";
	}

	return playlistStore.getDeleteTitle(playerStore.song);
});

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

const handleLyrics = async () => {
	if (!playerStore.song) {
		return;
	}

	modalStore.openModal("lyrics", { audio: playerStore.song });
};
</script>

<style scoped lang="scss">
.fullscreen-controls-top-mobile {
	display: none;

	@media (max-width: 768px) {
		display: flex;
		align-items: center;
		justify-content: flex-start;
		width: 100%;
		margin-bottom: 12px;
		order: 1;

		.fullscreen-controls-left {
			flex: 0;
			justify-content: flex-start;
			gap: 8px;
			width: auto;
		}
	}

	@media (max-width: 480px) {
		margin-bottom: 8px;

		.fullscreen-controls-left {
			gap: 6px;
		}
	}
}

.btn-fullscreen-vk {
	background: rgba(255, 255, 255, 0.1);
	border: none;
	border-radius: 50%;
	width: 44px;
	height: 44px;
	display: flex;
	align-items: center;
	justify-content: center;
	color: rgba(255, 255, 255, 0.7);
	cursor: pointer;
	transition: transform 0.2s ease, background-color 0.2s ease, color 0.2s ease;

	@media (max-width: 768px) {
		width: 40px;
		height: 40px;
	}

	@media (max-width: 480px) {
		width: 36px;
		height: 36px;
	}

	&:hover {
		background: rgba(255, 255, 255, 0.15);
		color: #fff;
	}

	&:active {
		opacity: 0.8;
	}
}
</style>

