<template>
	<div class="settings-page">
		<ModalSettings :is-page="true" />
	</div>
</template>

<script setup lang="ts">
import ModalSettings from "~/components/ModalSettings.vue";
</script>

<style scoped lang="scss">
.settings-page {
	display: flex;
	flex-direction: column;
	min-height: 100%;
	width: 100%;
}
</style>

