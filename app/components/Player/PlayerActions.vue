<template>
	<div class="player-actions">
		<button
			class="player-action-button"
			:class="{ active: repeat }"
			@click="playlistStore.toggleRepeat"
			:title="repeat ? getString('player.repeatOn') : getString('player.repeat')"
		>
			<Icon name="mdi:repeat" size="20" />
		</button>

		<button
			class="player-action-button"
			:class="{ active: shuffle }"
			@click="playlistStore.toggleShuffle"
			:title="getString('player.shuffle')"
		>
			<Icon name="mdi:shuffle" size="20" />
		</button>
	</div>
</template>

<script setup lang="ts">
import { computed } from "vue";

const playlistStore = usePlaylistStore();
const { getString } = useStrings();

// Используем напрямую из store для правильной реактивности
const repeat = computed(() => playlistStore.repeat);
const shuffle = computed(() => playlistStore.shuffle);
</script>

<style scoped lang="scss">
.player-actions {
	display: flex;
	align-items: center;
	gap: 8px;

	@media (max-width: 1200px) {
		gap: 6px;
	}

	@media (max-width: 1000px) {
		gap: 4px;
	}
}

.player-action-button {
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
</style>