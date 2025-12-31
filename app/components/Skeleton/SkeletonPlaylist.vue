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
}

.skeleton-tracks {
	display: flex;
	flex-direction: column;
	padding: 0 32px;
	gap: 8px;
}
</style>


