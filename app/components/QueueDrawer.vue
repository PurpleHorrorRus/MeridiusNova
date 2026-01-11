<template>
	<Teleport to="body">
		<Transition name="queue-drawer">
			<div
				v-if="playerStore.isQueueDrawerOpen"
				class="queue-drawer-overlay"
				@click="playerStore.closeQueueDrawer"
			>
				<div
					class="queue-drawer"
					@click.stop
				>
					<QueueContent
						@close="playerStore.closeQueueDrawer"
					/>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<script setup lang="ts">
import QueueContent from "~/components/QueueContent.vue";

import { usePlayerStore } from "~/stores/player";

import { useEventListener } from "~/composables/useEventListener";

const playerStore = usePlayerStore();

const handleEscape = (event: KeyboardEvent) => {
	if (event.key === "Escape" && playerStore.isQueueDrawerOpen) {
		playerStore.closeQueueDrawer();
	}
};

useEventListener(document, "keydown", handleEscape);
</script>

<style scoped lang="scss">
.queue-drawer-overlay {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.5);
	z-index: 2000;

	backdrop-filter: blur(4px);
	display: flex;
	justify-content: flex-end;
}

.queue-drawer {
	width: 400px;
	max-width: 90vw;
	height: 100%;
	background: var(--bg-sidebar, #1a1a1a);
	border-left: 1px solid var(--border, #2a2a2a);
	display: flex;
	flex-direction: column;
	box-shadow: -4px 0 24px rgba(0, 0, 0, 0.5);

	@media (max-width: 600px) {
		width: 100%;
		max-width: 100vw;
	}
}

.queue-drawer-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 24px;
	border-bottom: 1px solid var(--border, #2a2a2a);
	gap: 12px;

	@media (max-width: 600px) {
		padding: 20px;
		gap: 8px;
	}
}

.queue-drawer-header-actions {
	display: flex;
	align-items: center;
	gap: 8px;
}

.queue-drawer-title {
	font-size: 24px;
	font-weight: 700;
	margin: 0;
	color: var(--text, #fff);

	@media (max-width: 600px) {
		font-size: 20px;
	}
}

.queue-drawer-clear-button {
	background: none;
	border: none;
	color: var(--text-secondary, #b3b3b3);
	cursor: pointer;
	padding: 8px;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 50%;
	transition: background-color 0.2s, color 0.2s;

	&:hover {
		background: var(--hover, #2a2a2a);
		color: var(--text, #fff);
	}
}

.queue-drawer-close {
	background: none;
	border: none;
	color: var(--text-secondary, #b3b3b3);
	cursor: pointer;
	padding: 8px;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 50%;
	transition: background-color 0.2s, color 0.2s;

	&:hover {
		background: var(--hover, #2a2a2a);
		color: var(--text, #fff);
	}
}

.queue-drawer-empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	flex: 1;
	gap: 16px;
	color: var(--text-secondary, #b3b3b3);

	:deep(svg) {
		opacity: 0.5;
	}

	p {
		font-size: 16px;
		margin: 0;
	}
}

.queue-drawer-content {
	display: flex;
	flex-direction: column;
	flex: 1;
	overflow: hidden;
}

.queue-drawer-current-playlist {
	display: flex;
	align-items: center;
	gap: 16px;
	padding: 20px 24px;
	border-bottom: 1px solid var(--border, #2a2a2a);
	background: var(--bg-secondary, #1f1f1f);
	transition: background 0.2s;

	@media (max-width: 600px) {
		padding: 16px 20px;
		gap: 12px;
	}

	&.queue-drawer-current-playlist-clickable {
		cursor: pointer;

		&:hover {
			background: var(--hover, #2a2a2a);
		}
	}
}

.queue-drawer-current-cover {
	width: 80px;
	height: 80px;
	border-radius: 12px;
	overflow: hidden;
	flex-shrink: 0;
	transition: transform 0.2s;
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);

	@media (max-width: 600px) {
		width: 64px;
		height: 64px;
		border-radius: 10px;
	}
}

.queue-drawer-current-cover-image {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.queue-drawer-current-info {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.queue-drawer-current-title {
	font-size: 16px;
	font-weight: 600;
	color: var(--text, #fff);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;

	@media (max-width: 600px) {
		font-size: 14px;
	}
}

.queue-drawer-current-description {
	font-size: 14px;
	color: var(--text-secondary, #b3b3b3);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;

	@media (max-width: 600px) {
		font-size: 12px;
	}
}

.queue-drawer-current-meta {
	display: flex;
	align-items: center;
	gap: 8px;
	font-size: 12px;
	color: var(--text-secondary, #b3b3b3);
	flex-wrap: wrap;

	@media (max-width: 600px) {
		font-size: 11px;
		gap: 4px;
	}
}

.queue-drawer-current-author {
	font-weight: 600;
	color: var(--text, #fff);
}

.queue-drawer-current-size,
.queue-drawer-current-listens {
	&::before {
		content: "•";
		margin: 0 4px;
	}

	@media (max-width: 600px) {
		&::before {
			margin: 0 2px;
		}
	}
}

.queue-drawer-tracks {
	flex: 1;
	overflow-y: auto;
	padding: 8px 0;
}

.queue-drawer-track-active {
	background: var(--active, rgba(233, 0, 63, 0.1)) !important;
}

.queue-drawer-enter-active,
.queue-drawer-leave-active {
	transition: opacity 0.3s ease;
}

.queue-drawer-enter-active .queue-drawer,
.queue-drawer-leave-active .queue-drawer {
	transition: transform 0.3s ease;
}

.queue-drawer-enter-from,
.queue-drawer-leave-to {
	opacity: 0;
}

.queue-drawer-enter-from .queue-drawer,
.queue-drawer-leave-to .queue-drawer {
	transform: translateX(100%);
}
</style>