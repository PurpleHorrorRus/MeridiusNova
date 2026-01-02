<template>
	<div class="skeleton-vkmix">
		<div class="skeleton-vkmix-cover"></div>
		<div class="skeleton-vkmix-info">
			<div class="skeleton-vkmix-title"></div>
			<div class="skeleton-vkmix-description"></div>
		</div>
	</div>
</template>

<script setup lang="ts">
// No props needed
</script>

<style scoped lang="scss">
.skeleton-vkmix {
	display: flex;
	gap: 24px;
	align-items: center;
	padding: 24px;
	background: var(--bg-secondary, #181818);
	border-radius: 12px;

	@media (max-width: 768px) {
		gap: 16px;
		padding: 16px;
		border-radius: 8px;
	}

	@media (max-width: 480px) {
		gap: 12px;
		padding: 12px;
		border-radius: 6px;
	}
}

.skeleton-vkmix-cover {
	width: 120px;
	height: 120px;
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
		width: 100px;
		height: 100px;
		border-radius: 6px;
	}

	@media (max-width: 480px) {
		width: 80px;
		height: 80px;
		border-radius: 4px;
	}
}

.skeleton-vkmix-info {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 12px;

	@media (max-width: 480px) {
		gap: 8px;
	}
}

.skeleton-vkmix-title {
	height: 24px;
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
		height: 20px;
	}

	@media (max-width: 480px) {
		height: 18px;
		border-radius: 3px;
	}
}

.skeleton-vkmix-description {
	height: 16px;
	width: 80%;
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


