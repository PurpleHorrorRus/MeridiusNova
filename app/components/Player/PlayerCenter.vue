<template>
	<div class="player-center">
		<div class="controls-row">
			<div class="main-controls">
				<button class="btn-control" @click.stop="playerStore.prev()">
					<Icon name="mdi:skip-previous" size="24" />
				</button>
				
			<button class="btn-play" @click.stop="playerStore.toggle()">
				<Icon v-if="paused" name="mdi:play" />
				<Icon v-else name="mdi:pause" />
			</button>
				
				<button class="btn-control" @click.stop="playerStore.next({ manual: true })">
					<Icon name="mdi:skip-next" size="24" />
				</button>
			</div>
			
			<div class="time-display">
				<span class="time-current">{{ playerStore.formatTime(currentTime) }}</span>
				<span class="time-separator">/</span>
				<span class="time-duration">{{ playerStore.formatTime(duration) }}</span>
			</div>
			
			<div class="secondary-controls">
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { usePlayerStore } from "~/stores/player";

const playerStore = usePlayerStore();
const { paused, currentTime, duration } = storeToRefs(playerStore);
</script>

<style scoped lang="scss">
.player-center {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	flex: 1;
	max-width: 600px;

	@media (max-width: 800px) {
		display: none;
	}
}

.controls-row {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 24px;
	width: 100%;
	position: relative;

	@media (max-width: 1400px) {
		gap: 16px;
	}

	@media (max-width: 1200px) {
		gap: 12px;
	}

	@media (max-width: 1000px) {
		gap: 8px;
	}
}

.main-controls {
	display: flex;
	align-items: center;
	gap: 16px;

	@media (max-width: 1400px) {
		gap: 12px;
	}

	@media (max-width: 1200px) {
		gap: 10px;
	}

	@media (max-width: 1000px) {
		gap: 6px;
	}
}

.btn-control {
	background: none;
	border: none;
	color: rgba(255, 255, 255, 0.7);
	cursor: pointer;
	padding: 12px;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	transition: background-color 0.2s ease, color 0.2s ease;
	min-width: 44px;
	min-height: 44px;

	@media (max-width: 1200px) {
		padding: 10px;
		min-width: 40px;
		min-height: 40px;

		:deep(svg) {
			width: 20px;
			height: 20px;
		}
	}

	@media (max-width: 1000px) {
		padding: 8px;
		min-width: 36px;
		min-height: 36px;

		:deep(svg) {
			width: 18px;
			height: 18px;
		}
	}

	&:hover:not(:disabled) {
		color: #fff;
		background: rgba(255, 255, 255, 0.1);
	}

	&:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}
}

.btn-play {
	width: 44px;
	height: 44px;
	border-radius: 50%;
	border: 1px solid rgba(255, 255, 255, 0.2);
	background: rgba(255, 255, 255, 0.15);
	color: #fff;

	display: flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	transition: background-color 0.2s ease, border-color 0.2s ease, opacity 0.2s ease;
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);

	:deep(svg) {
		pointer-events: none;
		width: 24px;
		height: 24px;
	}

	@media (max-width: 1200px) {
		width: 40px;
		height: 40px;

		:deep(svg) {
			width: 22px;
			height: 22px;
		}
	}

	@media (max-width: 1000px) {
		width: 38px;
		height: 38px;

		:deep(svg) {
			width: 20px;
			height: 20px;
		}
	}

	&:hover {
		background: rgba(255, 255, 255, 0.25);
		border-color: rgba(255, 255, 255, 0.3);
		box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
	}

	&:active {
		opacity: 0.9;
	}
}

.secondary-controls {
	position: absolute;
	right: 0;
	height: 100%;
	display: flex;
	align-items: center;
}

.time-display {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 6px;
	font-size: 12px;
	color: rgba(255, 255, 255, 0.7);
	font-weight: 500;
	letter-spacing: 0.5px;
	margin-left: 16px;
	white-space: nowrap;

	@media (max-width: 1400px) {
		margin-left: 12px;
	}

	@media (max-width: 1200px) {
		font-size: 11px;
		margin-left: 10px;
	}

	@media (max-width: 1000px) {
		font-size: 10px;
		margin-left: 8px;
	}

	@media (max-width: 800px) {
		display: none;
	}
}

.time-current {
	color: rgba(255, 255, 255, 0.9);
}

.time-separator {
	color: rgba(255, 255, 255, 0.4);
	margin: 0 2px;
}

.time-duration {
	color: rgba(255, 255, 255, 0.6);
}
</style>

