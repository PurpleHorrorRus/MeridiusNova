<template>
	<div class="skeleton-album-card">
		<div class="skeleton-album-cover"></div>
		<div class="skeleton-album-title"></div>
	</div>
</template>

<script setup lang="ts">
// No props needed
</script>

<style scoped lang="scss">
.skeleton-album-card {
	display: flex;
	flex-direction: column;
	gap: 12px;
	min-width: 180px;
	flex-shrink: 0;
}

.skeleton-album-cover {
	width: 180px;
	height: 180px;
	border-radius: 8px;
	background: linear-gradient(
		90deg,
		rgba(255, 255, 255, 0.05) 0%,
		rgba(255, 255, 255, 0.1) 50%,
		rgba(255, 255, 255, 0.05) 100%
	);
	background-size: 200% 100%;
	animation: shimmer 1.5s infinite;
}

.skeleton-album-title {
	height: 16px;
	width: 70%;
	border-radius: 4px;
	background: linear-gradient(
		90deg,
		rgba(255, 255, 255, 0.05) 0%,
		rgba(255, 255, 255, 0.1) 50%,
		rgba(255, 255, 255, 0.05) 100%
	);
	background-size: 200% 100%;
	animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
	0% {
		background-position: -200% 0;
	}
	100% {
		background-position: 200% 0;
	}
}
</style>


