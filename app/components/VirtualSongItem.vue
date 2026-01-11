<template>
	<div
		ref="itemRef"
		class="virtual-song-item"
	>
		<slot />
	</div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick, onBeforeUnmount } from "vue";

const props = defineProps<{
	index: number;
}>();

const emit = defineEmits<{
	(height: number): void;
}>();

const itemRef = ref<HTMLElement | null>(null);
const resizeObserver = ref<ResizeObserver | null>(null);

const measureHeight = () => {
	if (!itemRef.value) {
		return;
	}

	const height = itemRef.value.offsetHeight;
	if (height > 0) {
		emit("height", height);
	}
};

onMounted(() => {
	nextTick(() => {
		measureHeight();

		if (itemRef.value) {
			resizeObserver.value = new ResizeObserver(() => {
				measureHeight();
			});

			resizeObserver.value.observe(itemRef.value);
		}
	});
});

onBeforeUnmount(() => {
	if (resizeObserver.value) {
		resizeObserver.value.disconnect();
	}
});

watch(() => props.index, () => {
	nextTick(() => {
		measureHeight();
	});
});
</script>

<style scoped lang="scss">
.virtual-song-item {
	width: 100%;
}
</style>

