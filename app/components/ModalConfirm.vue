<template>
	<div class="modal-confirm">
		<div class="modal-confirm-header" v-if="props.title">
			<h2 class="modal-confirm-title">{{ props.title }}</h2>
		</div>

		<div class="modal-confirm-content">
			<p class="modal-confirm-message">{{ props.message }}</p>
		</div>

		<div class="modal-confirm-actions">
			<button
				class="modal-confirm-button modal-confirm-button-cancel"
				@click="handleCancel"
			>
				{{ props.cancelText || getString("modal.confirm.cancel") }}
			</button>
			<button
				class="modal-confirm-button modal-confirm-button-confirm"
				@click="handleConfirm"
			>
				{{ props.confirmText || getString("modal.confirm.confirm") }}
			</button>
		</div>
	</div>
</template>

<script setup lang="ts">
import { useModalStore } from "~/stores/modal";
import type { ModalConfirmProps } from "~/stores/modal";

const modalStore = useModalStore();
const { getString } = useStrings();

const props = computed(() => modalStore.props as ModalConfirmProps);

const handleConfirm = async () => {
	await modalStore.confirm();
};

const handleCancel = async () => {
	await modalStore.cancel();
};
</script>

<style scoped lang="scss">
.modal-confirm {
	display: flex;
	flex-direction: column;
	height: 100%;
	padding: 32px;
}

.modal-confirm-header {
	margin-bottom: 24px;
}

.modal-confirm-title {
	font-size: 24px;
	font-weight: 600;
	margin: 0;
	color: var(--text, #fff);
}

.modal-confirm-content {
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: center;
}

.modal-confirm-message {
	font-size: 16px;
	line-height: 1.5;
	color: var(--text-secondary, #b3b3b3);
	margin: 0;
	text-align: center;
}

.modal-confirm-actions {
	display: flex;
	gap: 12px;
	justify-content: flex-end;
	margin-top: 24px;
}

.modal-confirm-button {
	padding: 10px 24px;
	border: none;
	border-radius: 6px;
	font-size: 14px;
	font-weight: 500;
	cursor: pointer;
	transition: all 0.2s ease;
	min-width: 100px;
}

.modal-confirm-button-cancel {
	background: var(--bg-tertiary, #282828);
	color: var(--text, #fff);

	&:hover {
		background: var(--bg-hover, #2a2a2a);
	}
}

.modal-confirm-button-confirm {
	background: var(--secondary, #e9003f);
	color: var(--text, #fff);

	&:hover {
		background: var(--primary-hover, #ff1a5c);
	}
}
</style>

