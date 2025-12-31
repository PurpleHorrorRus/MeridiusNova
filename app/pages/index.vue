<template>
	<div class="index-page">
		<LoadingSpinner />
	</div>
</template>

<script setup lang="ts">
// Отключаем layout для этой страницы
definePageMeta({
	layout: false
});
</script>

<style scoped lang="scss">
.index-page {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 100%;
	height: 100vh;
	background: var(--bg-primary, #121212);
}
</style>