<template>
	<div class="skeleton-container">
		<SkeletonPlaylistHeader v-if="showHeader" />
		<div class="skeleton-tracks">
			<SkeletonTrack v-for="i in count" :key="i" />
		</div>
	</div>
</template>

<script setup lang="ts">
interface Props {
	count?: number;
	showHeader?: boolean;
}

withDefaults(defineProps<Props>(), {
	count: 15,
	showHeader: true
});
</script>

<style scoped lang="scss">
.skeleton-container {
	display: flex;
	flex-direction: column;
	gap: 32px;

	@media (max-width: 768px) {
		gap: 24px;
	}

	@media (max-width: 480px) {
		gap: 16px;
	}
}

.skeleton-tracks {
	display: flex;
	flex-direction: column;
	padding: 0 32px;
	gap: 8px;

	@media (max-width: 768px) {
		padding: 0 16px;
		gap: 6px;
	}

	@media (max-width: 480px) {
		padding: 0 12px;
		gap: 4px;
	}
}
</style>


