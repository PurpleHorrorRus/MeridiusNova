<template>
	<div class="fullscreen-controls">
		<div class="fullscreen-controls-main">
			<div v-if="isMobile" class="fullscreen-controls-left">
				<button
					class="btn-fullscreen-control"
					:class="{ active: repeat }"
					@click.stop="playlistStore.toggleRepeat"
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
					@click.stop="playlistStore.toggleShuffle"
					:title="t('player.shuffle')"
				>
					<Icon name="mdi:shuffle" size="24" />
				</button>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { useAudio } from "~/composables/useAudio";
import { usePlaylist } from "~/composables/usePlaylist";
import { usePlaylistStore } from "~/stores/playlist";
import { useStrings } from "~/composables/useStrings";
import { useIsMobile } from "~/composables/useIsMobile";

const { paused, toggle, playNext, playPrevious } = useAudio();
const { getString } = useStrings();
const t = getString;
const playlistStore = usePlaylistStore();
const { repeat, shuffle } = usePlaylist();
const { isMobile } = useIsMobile();

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
	gap: min(24px, 2.5vh);
	box-sizing: border-box;

	@media (max-height: 700px) {
		gap: min(20px, 2vh);
	}

	@media (max-height: 600px) {
		gap: min(16px, 1.5vh);
	}

	@media (max-width: 768px) {
		width: 100%;
		flex-direction: row;
		flex-wrap: nowrap;
		gap: min(12px, 1.5vh);
		align-items: center;
		justify-content: space-between;
	}

	@media (max-width: 480px) {
		gap: min(8px, 1vh);
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
	gap: min(32px, 3.5vh);
	flex-shrink: 0;

	@media (max-height: 700px) {
		gap: min(28px, 3vh);
	}

	@media (max-height: 600px) {
		gap: min(24px, 2.5vh);
	}

	@media (max-width: 768px) {
		gap: min(24px, 2.5vh);
		width: auto;
		justify-content: center;
		flex: 0;
		box-sizing: border-box;
	}

	@media (max-width: 480px) {
		gap: min(16px, 2vh);
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
	position: relative;
	background: rgba(255, 255, 255, 0.1);
	border: none;
	border-radius: 50%;
	width: min(56px, 6vh);
	aspect-ratio: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	color: rgba(255, 255, 255, 0.9);
	cursor: pointer;
	transition: background-color 0.2s ease, color 0.2s ease, opacity 0.2s ease;

	@media (max-height: 700px) {
		width: min(48px, 5.5vh);
	}

	@media (max-height: 600px) {
		width: min(44px, 5vh);
	}

	@media (max-width: 768px) {
		width: min(48px, 5.5vh);
	}

	@media (max-width: 480px) {
		width: min(44px, 5vh);
	}

	&:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.2);
		color: #fff;
	}

	&:active:not(:disabled) {
		opacity: 0.8;
	}

	&:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}
}

.btn-play-fullscreen {
	position: relative;
	width: min(80px, 8vh);
	aspect-ratio: 1;
	border-radius: 50%;
	border: 2px solid rgba(255, 255, 255, 0.3);
	background: rgba(255, 255, 255, 0.15);
	color: #fff;

	display: flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	transition: background-color 0.2s ease, border-color 0.2s ease, opacity 0.2s ease;
	overflow: visible;

	@media (max-height: 700px) {
		width: min(70px, 7.5vh);
	}

	@media (max-height: 600px) {
		width: min(64px, 7vh);
	}

	@media (max-width: 768px) {
		width: min(70px, 7.5vh);
	}

	@media (max-width: 480px) {
		width: min(64px, 7vh);
	}

	&:hover {
		background: rgba(255, 255, 255, 0.25);
		border-color: rgba(255, 255, 255, 0.4);

		&::before {
			opacity: 1.2;
		}
	}

	&:active {
		opacity: 0.9;
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
	transition: transform 0.2s ease, background-color 0.2s ease, color 0.2s ease;

	@media (max-height: 700px) {
		width: min(40px, 4vh);
	}

	@media (max-height: 600px) {
		width: min(36px, 3.5vh);
	}

	@media (max-width: 768px) {
		width: min(40px, 4vh);
	}

	@media (max-width: 480px) {
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

