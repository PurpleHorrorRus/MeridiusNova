<template>
	<div class="skeleton-header">
		<div class="skeleton-cover"></div>
		<div class="skeleton-info">
			<div class="skeleton-title"></div>
			<div class="skeleton-subtitle"></div>
		</div>
	</div>
</template>

<script setup lang="ts">
// No props needed
</script>

<style scoped lang="scss">
.skeleton-header {
	display: flex;
	gap: 24px;
	align-items: center;
	padding: 0 32px;

	@media (max-width: 768px) {
		gap: 16px;
		padding: 0 16px;
	}

	@media (max-width: 480px) {
		gap: 12px;
		padding: 0 12px;
		flex-direction: column;
		align-items: flex-start;
	}
}

.skeleton-cover {
	width: 200px;
	height: 200px;
	border-radius: 8px;
	background: linear-gradient(
		90deg,
		rgba(255, 255, 255, 0.05) 0%,
		rgba(255, 255, 255, 0.1) 50%,
		rgba(255, 255, 255, 0.05) 100%
	);
	background-size: 200% 100%;
	animation: shimmer 1.5s infinite;
	flex-shrink: 0;

	@media (max-width: 768px) {
		width: 160px;
		height: 160px;
		border-radius: 6px;
	}

	@media (max-width: 480px) {
		width: 120px;
		height: 120px;
		border-radius: 4px;
	}
}

.skeleton-info {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 12px;

	@media (max-width: 480px) {
		width: 100%;
		gap: 8px;
	}
}

.skeleton-title {
	height: 32px;
	width: 60%;
	border-radius: 4px;
	background: linear-gradient(
		90deg,
		rgba(255, 255, 255, 0.05) 0%,
		rgba(255, 255, 255, 0.1) 50%,
		rgba(255, 255, 255, 0.05) 100%
	);
	background-size: 200% 100%;
	animation: shimmer 1.5s infinite;

	@media (max-width: 768px) {
		height: 28px;
	}

	@media (max-width: 480px) {
		height: 24px;
		width: 80%;
		border-radius: 3px;
	}
}

.skeleton-subtitle {
	height: 20px;
	width: 40%;
	border-radius: 4px;
	background: linear-gradient(
		90deg,
		rgba(255, 255, 255, 0.05) 0%,
		rgba(255, 255, 255, 0.1) 50%,
		rgba(255, 255, 255, 0.05) 100%
	);
	background-size: 200% 100%;
	animation: shimmer 1.5s infinite;

	@media (max-width: 768px) {
		height: 18px;
	}

	@media (max-width: 480px) {
		height: 16px;
		width: 60%;
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


