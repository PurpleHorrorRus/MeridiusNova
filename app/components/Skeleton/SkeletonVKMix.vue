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
}

.skeleton-vkmix-info {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 12px;
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


