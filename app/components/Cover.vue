<template>
	<NuxtImg
		:src="src || '/no-cover.webp'"
		:alt="alt ?? ''"
		:width="width"
		:height="height"
		format="webp"
		quality="80"
		:loading="priority ? 'eager' : 'lazy'"
		:fetchpriority="priority ? 'high' : undefined"
		preload
	/>
</template>

<script setup lang="ts">
defineProps<{
    src?: string;
    alt?: string;
    width?: number;
    height?: number;
    priority?: boolean;
}>();
</script>

<style scoped lang="scss">
img {
	width: 100%;
	height: 100%;
	object-fit: cover;
	display: block;
}
</style>