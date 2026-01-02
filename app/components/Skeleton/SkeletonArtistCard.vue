<template>
	<div class="skeleton-artist-card">
		<div class="skeleton-artist-cover"></div>
		<div class="skeleton-artist-name"></div>
	</div>
</template>

<script setup lang="ts">
// No props needed
</script>

<style scoped lang="scss">
.skeleton-artist-card {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 12px;

	@media (max-width: 768px) {
		gap: 10px;
	}

	@media (max-width: 480px) {
		gap: 8px;
	}
}

.skeleton-artist-cover {
	width: 160px;
	height: 160px;
	border-radius: 50%;
	background: linear-gradient(
		90deg,
		rgba(255, 255, 255, 0.05) 0%,
		rgba(255, 255, 255, 0.1) 50%,
		rgba(255, 255, 255, 0.05) 100%
	);
	background-size: 200% 100%;
	animation: shimmer 1.5s infinite;

	@media (max-width: 768px) {
		width: 120px;
		height: 120px;
	}

	@media (max-width: 480px) {
		width: 100px;
		height: 100px;
	}
}

.skeleton-artist-name {
	height: 16px;
	width: 80px;
	border-radius: 4px;
	background: linear-gradient(
		90deg,
		rgba(255, 255, 255, 0.05) 0%,
		rgba(255, 255, 255, 0.1) 50%,
		rgba(255, 255, 255, 0.05) 100%
	);
	background-size: 200% 100%;
	animation: shimmer 1.5s infinite;

	@media (max-width: 480px) {
		height: 14px;
		width: 70px;
		border-radius: 3px;
	}
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


