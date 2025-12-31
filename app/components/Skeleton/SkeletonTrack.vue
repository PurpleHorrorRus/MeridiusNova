<template>
	<div class="skeleton-track">
		<div class="skeleton-track-cover"></div>
		<div class="skeleton-track-info">
			<div class="skeleton-track-title"></div>
			<div class="skeleton-track-artist"></div>
		</div>
		<div class="skeleton-track-duration"></div>
	</div>
</template>

<script setup lang="ts">
// No props needed
</script>

<style scoped lang="scss">
.skeleton-track {
	display: grid;
	grid-template-columns: 40px 1fr 1fr 60px;
	gap: 16px;
	align-items: center;
	padding: 8px 16px;
}

.skeleton-track-cover {
	width: 40px;
	height: 40px;
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

.skeleton-track-info {
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.skeleton-track-title {
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

.skeleton-track-artist {
	height: 14px;
	width: 50%;
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

.skeleton-track-duration {
	height: 14px;
	width: 40px;
	border-radius: 4px;
	background: linear-gradient(
		90deg,
		rgba(255, 255, 255, 0.05) 0%,
		rgba(255, 255, 255, 0.1) 50%,
		rgba(255, 255, 255, 0.05) 100%
	);
	background-size: 200% 100%;
	animation: shimmer 1.5s infinite;
	justify-self: end;
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


