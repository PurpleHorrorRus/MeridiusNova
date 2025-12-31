<template>
	<div class="loading-skeleton">
		<div v-for="i in count" :key="i" class="skeleton-item">
			<div class="skeleton-line" :style="{ width: getRandomWidth() }"></div>
		</div>
	</div>
</template>

<script setup lang="ts">
interface Props {
	count?: number;
}

const props = withDefaults(defineProps<Props>(), {
	count: 3
});

const getRandomWidth = () => {
	const widths = ["60%", "80%", "100%", "70%", "90%"];
	return widths[Math.floor(Math.random() * widths.length)];
};
</script>

<style scoped lang="scss">
.loading-skeleton {
	display: flex;
	flex-direction: column;
	gap: 12px;
	padding: 20px;
}

.skeleton-item {
	width: 100%;
}

.skeleton-line {
	height: 20px;
	background: linear-gradient(
		90deg,
		rgba(255, 255, 255, 0.05) 0%,
		rgba(255, 255, 255, 0.1) 50%,
		rgba(255, 255, 255, 0.05) 100%
	);
	background-size: 200% 100%;
	border-radius: 4px;
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


