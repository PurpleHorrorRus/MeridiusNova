<template>
	<div class="loading-spinner">
		<Icon name="mdi:loading" size="24" class="spinner-icon" />
	</div>
</template>

<script setup lang="ts">
// No props needed, just a simple spinner component
</script>

<style scoped lang="scss">
.loading-spinner {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 40px;
}

.spinner-icon {
	animation: spin 1s linear infinite;
	color: var(--text-secondary, #b3b3b3);
}

@keyframes spin {
	from {
		transform: rotate(0deg);
	}
	to {
		transform: rotate(360deg);
	}
}
</style>


