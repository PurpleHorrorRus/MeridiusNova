<template>
	<Teleport to="body">
		<Transition name="modal">
			<div
				v-if="modalStore.isOpen"
				class="modal-overlay"
				@click.self="handleOverlayClick"
				@keydown.esc="handleEscape"
			>
			<div class="modal-container" :class="{ 'modal-container-lyrics': modalStore.type === 'lyrics' }">
				<ModalConfirm v-if="modalStore.type === 'confirm'" />
				<ModalSettings v-else-if="modalStore.type === 'settings'" />
				<ModalEditTrack
					v-else-if="modalStore.type === 'editTrack'"
					:audio="(modalStore.props as any).audio"
				/>
				<ModalLyrics
					v-else-if="modalStore.type === 'lyrics'"
					:audio="(modalStore.props as any).audio"
				/>
				<ModalShareAudio
					v-else-if="modalStore.type === 'shareAudio'"
					:audio="(modalStore.props as any).audio"
				/>
				<ModalSongActions
					v-else-if="modalStore.type === 'songActions'"
					:audio="(modalStore.props as any).audio"
				/>
				<component
					v-else-if="modalStore.type === 'custom'"
					:is="(modalStore.props as any).component"
					v-bind="(modalStore.props as any).props || {}"
				/>
			</div>
			</div>
		</Transition>
	</Teleport>
</template>

<script setup lang="ts">
import ModalConfirm from "~/components/ModalConfirm.vue";
import ModalEditTrack from "~/components/Modals/ModalEditTrack.vue";
import ModalLyrics from "~/components/Modals/ModalLyrics.vue";
import ModalSettings from "~/components/ModalSettings.vue";
import ModalShareAudio from "~/components/Modals/ModalShareAudio.vue";
import ModalSongActions from "~/components/Modals/ModalSongActions.vue";

import { useModalStore } from "~/stores/modal";

import { useEventListener } from "~/composables/useEventListener";

const modalStore = useModalStore();

const handleOverlayClick = () => {
	if (modalStore.type === "settings") {
		modalStore.close();
	} else if (modalStore.type === "confirm") {
		modalStore.cancel();
	} else {
		modalStore.close();
	}
};

const handleEscape = (event: KeyboardEvent) => {
	if (event.key === "Escape" && modalStore.isOpen) {
		if (modalStore.type === "settings") {
			modalStore.close();
		} else if (modalStore.type === "confirm") {
			modalStore.cancel();
		} else {
			modalStore.close();
		}
	}
};

useEventListener(document, "keydown", handleEscape);
</script>

<style scoped lang="scss">
.modal-overlay {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.6);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 10002;
	padding: 40px;

	backdrop-filter: blur(2px);

	@media (max-width: 1024px) {
		padding: 24px;
	}

	@media (max-width: 768px) {
		padding: 16px;
	}
}

.modal-container {
	width: 60%;
	max-width: 1200px;
	height: 70%;
	max-height: 800px;
	background: var(--bg-primary, #121212);
	border-radius: 12px;
	box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
	display: flex;
	flex-direction: column;
	overflow: visible;
	position: relative;

	@media (max-width: 1024px) {
		width: 80%;
		height: 80%;
	}

	@media (max-width: 768px) {
		width: 100%;
		height: auto;
		max-height: 85vh;
		align-items: flex-end;
		justify-content: flex-end;
		padding-bottom: env(safe-area-inset-bottom, 0);
	}

	:deep(.lyrics-modal) {
		width: 100%;
		height: 100%;
	}
}

.modal-container-lyrics {
	width: 80%;
	max-width: 1200px;
	height: 80%;
	max-height: 900px;
	align-items: stretch;
	justify-content: stretch;

	@media (max-width: 1024px) {
		width: 85%;
		height: 85%;
	}

	@media (max-width: 768px) {
		width: calc(100% - 32px);
		height: calc(100% - 32px);
		max-height: calc(100vh - 32px);
		margin: 16px;
	}
}

.modal-enter-active,
.modal-leave-active {
	transition: opacity 0.2s ease;
}

.modal-enter-active .modal-container,
.modal-leave-active .modal-container {
	transition: transform 0.2s ease, opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
	opacity: 0;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
	opacity: 0;
}
</style>

