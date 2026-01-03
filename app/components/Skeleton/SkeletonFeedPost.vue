<template>
	<div class="skeleton-feed-post">
		<div class="skeleton-post-header">
			<div class="skeleton-avatar"></div>
			<div class="skeleton-header-info">
				<div class="skeleton-name"></div>
				<div class="skeleton-time"></div>
			</div>
		</div>
		<div class="skeleton-post-text"></div>
		<div class="skeleton-tracks">
			<SkeletonTrack v-for="i in 2" :key="i" />
		</div>
	</div>
</template>

<script setup lang="ts">
import SkeletonTrack from "./SkeletonTrack.vue";
</script>

<style scoped lang="scss">
.skeleton-feed-post {
	padding: 16px;
	border-bottom: 1px solid var(--border, #2a2a2a);
}

.skeleton-post-header {
	display: flex;
	align-items: center;
	gap: 10px;
	margin-bottom: 12px;
}

.skeleton-avatar {
	width: 40px;
	height: 40px;
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

.skeleton-header-info {
	display: flex;
	flex-direction: column;
	gap: 6px;
	flex: 1;
}

.skeleton-name {
	height: 16px;
	width: 120px;
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

.skeleton-time {
	height: 12px;
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
}

.skeleton-post-text {
	height: 14px;
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
	margin-bottom: 12px;
}

.skeleton-tracks {
	display: flex;
	flex-direction: column;
	gap: 8px;
	margin-top: 12px;
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

