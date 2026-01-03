<template>
	<div class="fullscreen-repeat-shuffle">
		<button
			class="btn-fullscreen-control"
			:class="{ active: repeat }"
			@click.stop="toggleRepeat"
			:title="repeat ? t('player.repeatOn') : t('player.repeat')"
		>
			<Icon name="mdi:repeat" size="24" />
		</button>
		
		<button
			class="btn-fullscreen-control"
			:class="{ active: shuffle }"
			@click.stop="toggleShuffle"
			:title="t('player.shuffle')"
		>
			<Icon name="mdi:shuffle" size="24" />
		</button>
	</div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { usePlaylist } from "~/composables/usePlaylist";
import { usePlaylistStore } from "~/stores/playlist";
import { useStrings } from "~/composables/useStrings";
import { useIsMobile } from "~/composables/useIsMobile";

const { getString } = useStrings();
const t = getString;
const playlistStore = usePlaylistStore();
const { repeat } = usePlaylist();
const { isMobile } = useIsMobile();

const shuffle = computed(() => playlistStore.shuffle);

const toggleRepeat = () => {
	playlistStore.toggleRepeat();
};

const toggleShuffle = () => {
	playlistStore.toggleShuffle();
};
</script>

<style scoped lang="scss">
.fullscreen-repeat-shuffle {
	display: none;
	align-items: center;
	gap: 12px;
	flex-shrink: 0;

	@media (min-width: 769px) {
		display: flex;
	}
}

.btn-fullscreen-control {
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
	transition: all 0.2s ease;
	backdrop-filter: blur(10px);

	&:hover:not(.active) {
		background: rgba(255, 255, 255, 0.15);
		color: #fff;
	}

	&.active {
		color: var(--secondary, #e9003f);
		background: rgba(233, 0, 63, 0.2);
	}

	&:active {
		transform: scale(0.95);
	}
}
</style>

