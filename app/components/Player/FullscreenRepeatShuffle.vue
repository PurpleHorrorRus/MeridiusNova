<template>
	<div class="fullscreen-repeat-shuffle">
		<button
			class="btn-fullscreen-control"
			:class="{ active: repeat }"
			@click.stop="playlistStore.toggleRepeat"
			:title="repeat ? t('player.repeatOn') : t('player.repeat')"
		>
			<Icon name="mdi:repeat" size="24" />
		</button>
		
		<button
			class="btn-fullscreen-control"
			:class="{ active: shuffle }"
			@click.stop="playlistStore.toggleShuffle"
			:title="t('player.shuffle')"
		>
			<Icon name="mdi:shuffle" size="24" />
		</button>
	</div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";

import { useStrings } from "~/composables/useStrings";

const playlistStore = usePlaylistStore();

const { getString } = useStrings();
const t = getString;

const { repeat, shuffle } = storeToRefs(playlistStore);
</script>

<style scoped lang="scss">
.fullscreen-repeat-shuffle {
	display: none;
	align-items: center;
	gap: min(12px, 1.5vh);
	flex-shrink: 0;

	@media (min-width: 769px) {
		display: flex;
	}

	@media (max-height: 700px) {
		gap: min(10px, 1.2vh);
	}

	@media (max-height: 600px) {
		gap: min(8px, 1vh);
	}
}

.btn-fullscreen-control {
	background: rgba(255, 255, 255, 0.1);
	border: none;
	border-radius: 50%;
	width: min(44px, 4.5vh);
	aspect-ratio: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	color: rgba(255, 255, 255, 0.7);
	cursor: pointer;
	transition: background-color 0.2s ease, color 0.2s ease;

	@media (max-height: 700px) {
		width: min(40px, 4vh);
	}

	@media (max-height: 600px) {
		width: min(36px, 3.5vh);
	}

	&:hover:not(.active) {
		background: rgba(255, 255, 255, 0.15);
		color: #fff;
	}

	&.active {
		color: var(--secondary, #e9003f);
		background: rgba(233, 0, 63, 0.2);
	}

	&:active {
		opacity: 0.8;
	}
}
</style>

