<template>
	<button
		@click="handleClick"
		class="sidebar-settings-button"
	>
		<Icon name="mdi:cog" size="24" />
		<span class="sidebar-settings-text" v-text="getString('navigation.settings')" />
	</button>
</template>

<script setup lang="ts">
import { useModalStore } from "~/stores/modal";

import { useIsMobile } from "~/composables/useIsMobile";

const { getString } = useStrings();
const modalStore = useModalStore();
const { isMobile } = useIsMobile();

const handleClick = () => {
	if (isMobile.value) {
		navigateTo("/settings");
	} else {
		modalStore.openSettings();
	}
};
</script>

<style scoped lang="scss">
.sidebar-settings-button {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 12px 20px;
	color: var(--text-secondary, #b3b3b3);
	background: transparent;
	border: none;
	border-top: 1px solid var(--border, #2a2a2a);
	cursor: pointer;
	transition: background-color 0.2s, color 0.2s;
	text-align: left;
	width: 100%;

	@media (max-width: 1000px) {
		padding: 10px 16px;
		gap: 10px;
	}

	@media (max-width: 800px) {
		padding: 8px 12px;
		gap: 8px;
	}

	@media (max-width: 600px) {
		padding: 10px;
		justify-content: center;
		gap: 0;
	}

	&:hover {
		background: var(--hover, #2a2a2a);
		color: var(--text, #fff);
	}
}

.sidebar-settings-text {
	font-size: 14px;
	font-weight: 500;

	@media (max-width: 1000px) {
		font-size: 13px;
	}

	@media (max-width: 800px) {
		font-size: 12px;
	}

	@media (max-width: 600px) {
		display: none;
	}
}

@media (max-width: 600px) {
	.sidebar-settings-button {
		:deep(svg) {
			width: 24px;
			height: 24px;
		}
	}
}
</style>

