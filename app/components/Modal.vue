<template>
	<Teleport to="body">
		<Transition name="modal">
			<div
				v-if="modalStore.isOpen"
				class="modal-overlay"
				@click.self="handleOverlayClick"
				@keydown.esc="handleEscape"
			>
			<div class="modal-container">
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
import { useModalStore } from "~/stores/modal";
import ModalConfirm from "~/components/ModalConfirm.vue";
import ModalSettings from "~/components/ModalSettings.vue";
import ModalEditTrack from "~/components/Modals/ModalEditTrack.vue";
import ModalLyrics from "~/components/Modals/ModalLyrics.vue";
import ModalShareAudio from "~/components/Modals/ModalShareAudio.vue";

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

onMounted(() => {
	document.addEventListener("keydown", handleEscape);
});

onUnmounted(() => {
	document.removeEventListener("keydown", handleEscape);
});
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
	z-index: 1000;
	backdrop-filter: blur(2px);
}

.modal-container {
	width: 60%;
	max-width: 1200px;
	height: 70%;
	max-height: 800px;
	background: var(--bg-secondary, #181818);
	border-radius: 12px;
	box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
	display: flex;
	flex-direction: column;
	overflow: hidden;
	position: relative;

	@media (max-width: 1024px) {
		width: 80%;
		height: 80%;
	}

	@media (max-width: 768px) {
		width: 90%;
		height: 85%;
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
	transform: scale(0.95);
	opacity: 0;
}
</style>

