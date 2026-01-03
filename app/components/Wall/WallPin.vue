<template>
	<div class="wall-pin">
		<Icon name="mdi:pin" size="13" class="pin-icon" />
		<span class="pin-text">{{ getString("wall.pinned") }}</span>
	</div>
</template>

<script setup lang="ts">
const { getString } = useStrings();
</script>

<style scoped lang="scss">
.wall-pin {
	display: flex;
	align-items: center;
	gap: 5px;
	margin-left: 10px;
}

.pin-icon {
	transform: rotate(45deg);
	color: var(--text-secondary, #b3b3b3);
}

.pin-text {
	font-size: 11px;
	color: var(--text-secondary, #b3b3b3);
}
</style>

