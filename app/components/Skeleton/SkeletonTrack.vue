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

	@media (max-width: 768px) {
		grid-template-columns: 36px 1fr 1fr 50px;
		gap: 12px;
		padding: 8px 12px;
	}

	@media (max-width: 480px) {
		grid-template-columns: 32px 1fr 40px;
		gap: 8px;
		padding: 6px 8px;
	}
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

	@media (max-width: 768px) {
		width: 36px;
		height: 36px;
		border-radius: 3px;
	}

	@media (max-width: 480px) {
		width: 32px;
		height: 32px;
		border-radius: 3px;
	}
}

.skeleton-track-info {
	display: flex;
	flex-direction: column;
	gap: 6px;

	@media (max-width: 480px) {
		gap: 4px;
	}
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

	@media (max-width: 768px) {
		height: 14px;
	}

	@media (max-width: 480px) {
		height: 13px;
		border-radius: 3px;
	}
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

	@media (max-width: 768px) {
		height: 12px;
	}

	@media (max-width: 480px) {
		height: 11px;
		border-radius: 3px;
	}
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

	@media (max-width: 768px) {
		height: 12px;
		width: 35px;
	}

	@media (max-width: 480px) {
		height: 11px;
		width: 30px;
		border-radius: 3px;
		grid-column: 3;
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


