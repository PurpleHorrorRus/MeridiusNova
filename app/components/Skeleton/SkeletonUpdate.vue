<template>
	<div class="skeleton-update">
		<div class="skeleton-update-header">
			<div class="skeleton-avatar"></div>
			<div class="skeleton-update-info">
				<div class="skeleton-name"></div>
				<div class="skeleton-count"></div>
			</div>
		</div>
		<div class="skeleton-tracks">
			<SkeletonTrack v-for="i in 3" :key="i" />
		</div>
	</div>
</template>

<script setup lang="ts">
// No props needed
</script>

<style scoped lang="scss">
.skeleton-update {
	padding: 16px;
	border-bottom: 1px solid var(--border, #2a2a2a);
	margin-bottom: 24px;
}

.skeleton-update-header {
	display: flex;
	align-items: center;
	gap: 12px;
	margin-bottom: 12px;
}

.skeleton-avatar {
	width: 50px;
	height: 50px;
	border-radius: 50%;
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

.skeleton-update-info {
	display: flex;
	flex-direction: column;
	gap: 6px;
	flex: 1;
}

.skeleton-name {
	height: 16px;
	width: 150px;
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

.skeleton-count {
	height: 12px;
	width: 100px;
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

.skeleton-tracks {
	display: flex;
	flex-direction: column;
	gap: 8px;
	margin-left: 62px;
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


