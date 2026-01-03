<template>
	<div class="fullscreen-controls">
		<div class="fullscreen-controls-main">
			<div v-if="isMobile" class="fullscreen-controls-left">
				<button
					class="btn-fullscreen-control"
					:class="{ active: repeat }"
					@click.stop="toggleRepeat"
					:title="repeat ? t('player.repeatOn') : t('player.repeat')"
				>
					<Icon name="mdi:repeat" size="24" />
				</button>
			</div>
			
			<div class="fullscreen-controls-center">
				<button class="btn-control-fullscreen" @click.stop="playPrevious">
					<Icon name="mdi:skip-previous" size="32" />
				</button>
				
				<button class="btn-play-fullscreen" @click.stop="toggle">
					<Icon v-if="paused" name="mdi:play" size="40" />
					<Icon v-else name="mdi:pause" size="40" />
				</button>
				
				<button class="btn-control-fullscreen" @click.stop="playNext">
					<Icon name="mdi:skip-next" size="32" />
				</button>
			</div>
			
			<div class="fullscreen-controls-right">
				<button
					v-if="isMobile"
					class="btn-fullscreen-control"
					:class="{ active: shuffle }"
					@click.stop="toggleShuffle"
					:title="t('player.shuffle')"
				>
					<Icon name="mdi:shuffle" size="24" />
				</button>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useAudio } from "~/composables/useAudio";
import { usePlaylist } from "~/composables/usePlaylist";
import { usePlaylistStore } from "~/stores/playlist";
import { useStrings } from "~/composables/useStrings";
import { useIsMobile } from "~/composables/useIsMobile";

const { paused, toggle, playNext, playPrevious } = useAudio();
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
.fullscreen-controls {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 20px;
	width: auto;

	@media (max-width: 768px) {
		width: 100%;
		gap: 0;
	}
}

.fullscreen-controls-main {
	display: flex;
	align-items: center;
	justify-content: center;
	width: auto;
	gap: 24px;
	box-sizing: border-box;

	@media (max-width: 768px) {
		width: 100%;
		flex-direction: row;
		flex-wrap: nowrap;
		gap: 12px;
		align-items: center;
		justify-content: space-between;
	}

	@media (max-width: 480px) {
		gap: 8px;
	}
}

.fullscreen-controls-left {
	display: none;

	@media (max-width: 768px) {
		display: flex;
		align-items: center;
		justify-content: flex-start;
		flex: 1;
		width: auto;
		min-width: 0;
	}
}


.fullscreen-controls-center {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 32px;
	flex-shrink: 0;

	@media (max-width: 768px) {
		gap: 24px;
		width: auto;
		justify-content: center;
		flex: 0;
		box-sizing: border-box;
	}

	@media (max-width: 480px) {
		gap: 16px;
	}
}

.fullscreen-controls-right {
	display: none;

	@media (max-width: 768px) {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		flex: 1;
		width: auto;
		min-width: 0;
		gap: 8px;
	}

	@media (max-width: 480px) {
		gap: 6px;
	}
}

.btn-control-fullscreen {
	background: rgba(255, 255, 255, 0.1);
	border: none;
	border-radius: 50%;
	width: 56px;
	height: 56px;
	display: flex;
	align-items: center;
	justify-content: center;
	color: rgba(255, 255, 255, 0.9);
	cursor: pointer;
	transition: all 0.2s ease;
	backdrop-filter: blur(10px);

	@media (max-width: 768px) {
		width: 48px;
		height: 48px;
	}

	@media (max-width: 480px) {
		width: 44px;
		height: 44px;
	}

	&:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.2);
		color: #fff;
		transform: scale(1.05);
	}

	&:active:not(:disabled) {
		transform: scale(0.95);
	}

	&:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}
}

.btn-play-fullscreen {
	width: 80px;
	height: 80px;
	border-radius: 50%;
	border: 2px solid rgba(255, 255, 255, 0.3);
	background: rgba(255, 255, 255, 0.15);
	backdrop-filter: blur(15px);
	color: #fff;
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	transition: all 0.2s ease;
	box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);

	@media (max-width: 768px) {
		width: 70px;
		height: 70px;
	}

	@media (max-width: 480px) {
		width: 64px;
		height: 64px;
	}

	&:hover {
		transform: scale(1.05);
		background: rgba(255, 255, 255, 0.25);
		border-color: rgba(255, 255, 255, 0.4);
		box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
	}

	&:active {
		transform: scale(0.95);
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

	@media (max-width: 768px) {
		width: 40px;
		height: 40px;
	}

	@media (max-width: 480px) {
		width: 36px;
		height: 36px;
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
		transform: scale(0.95);
	}
}
</style>

