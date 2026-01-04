<template>
	<div
		ref="containerRef"
		class="virtual-song-list"
	>
		<div
			:style="spacerStyle"
			class="virtual-song-list-spacer"
		/>
		<div
			:style="contentStyle"
			class="virtual-song-list-content"
		>
			<slot
				:visibleItems="visibleItems"
				:startIndex="startIndex"
			/>
		</div>
		<div
			:style="bottomSpacerStyle"
			class="virtual-song-list-spacer"
		/>
		<div
			v-if="hasMore && showLoadMore"
			ref="loadMoreRef"
			class="virtual-song-list-load-more"
		>
			<slot name="loadMore">
				<LoadingSpinner v-if="isLoadingMore" />
			</slot>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount, inject, type Ref } from "vue";
import { useIntersectionObserver } from "~/composables/useIntersectionObserver";
import { useEventListener } from "~/composables/useEventListener";
import LoadingSpinner from "~/components/LoadingSpinner.vue";

export interface VirtualSongListProps {
	items: any[];
	itemHeight?: number;
	overscan?: number;
	hasMore?: boolean;
	isLoadingMore?: boolean;
	loadMore?: () => Promise<void> | void;
	scrollContainer?: HTMLElement | null;
}

const props = withDefaults(defineProps<VirtualSongListProps>(), {
	itemHeight: 56,
	overscan: 10,
	hasMore: false,
	isLoadingMore: false
});

const containerRef = ref<HTMLElement | null>(null);
const loadMoreRef = ref<HTMLElement | null>(null);
const scrollTop = ref(0);
const containerHeight = ref(0);
const layoutMainRef = inject<Ref<HTMLElement | null>>("layoutMainRef", ref(null));
let currentScrollContainer: HTMLElement | null = null;

const getScrollContainer = (): HTMLElement | null => {
	if (props.scrollContainer) {
		return props.scrollContainer;
	}
	if (layoutMainRef.value) {
		return layoutMainRef.value;
	}
	return containerRef.value;
};

const itemHeights = ref<Map<number, number>>(new Map());
const totalHeight = computed(() => {
	if (props.items.length === 0) {
		return 0;
	}

	let total = 0;
	for (let i = 0; i < props.items.length; i++) {
		const height = itemHeights.value.get(i) || props.itemHeight;
		total += height;
	}
	return total;
});

const getItemOffset = (index: number): number => {
	let offset = 0;
	for (let i = 0; i < index; i++) {
		const height = itemHeights.value.get(i) || props.itemHeight;
		offset += height;
	}
	return offset;
};

const visibleRange = computed(() => {
	if (props.items.length === 0 || containerHeight.value === 0) {
		return { start: 0, end: 0 };
	}

	const scrollTopValue = scrollTop.value;
	const containerHeightValue = containerHeight.value;
	const scrollBottom = scrollTopValue + containerHeightValue;

	let firstVisibleIndex = -1;
	let lastVisibleIndex = -1;

	let currentOffset = 0;
	for (let i = 0; i < props.items.length; i++) {
		const height = itemHeights.value.get(i) || props.itemHeight;
		const itemTop = currentOffset;
		const itemBottom = currentOffset + height;

		if (firstVisibleIndex === -1 && itemBottom >= scrollTopValue) {
			firstVisibleIndex = i;
		}

		if (itemTop <= scrollBottom) {
			lastVisibleIndex = i;
		} else if (firstVisibleIndex !== -1) {
			break;
		}

		currentOffset = itemBottom;
	}

	if (firstVisibleIndex === -1 || lastVisibleIndex === -1) {
		return { start: 0, end: Math.min(props.items.length - 1, props.overscan * 2) };
	}

	const overscanTop = Math.ceil(props.overscan * 0.7);
	const overscanBottom = Math.floor(props.overscan * 0.3);
	const start = Math.max(0, firstVisibleIndex - overscanTop);
	const end = Math.min(props.items.length - 1, lastVisibleIndex + overscanBottom);

	return { start, end };
});

const startIndex = computed(() => visibleRange.value.start);
const endIndex = computed(() => visibleRange.value.end);

const visibleItems = computed(() => {
	return props.items.slice(startIndex.value, endIndex.value + 1);
});

const topOffset = computed(() => {
	return getItemOffset(startIndex.value);
});

const bottomOffset = computed(() => {
	if (endIndex.value >= props.items.length - 1) {
		return 0;
	}
	
	if (endIndex.value < 0) {
		return 0;
	}
	
	let offset = 0;
	for (let i = endIndex.value + 1; i < props.items.length; i++) {
		const height = itemHeights.value.get(i) || props.itemHeight;
		offset += height;
	}
	
	return Math.max(0, offset);
});

const spacerStyle = computed(() => ({
	height: `${topOffset.value}px`
}));

const contentStyle = computed(() => ({
	position: "relative" as const
}));

const bottomSpacerStyle = computed(() => ({
	height: `${bottomOffset.value}px`
}));

const showLoadMore = computed(() => {
	return endIndex.value >= props.items.length - props.overscan;
});

let rafId: number | null = null;

const handleScroll = () => {
	if (rafId !== null) {
		return;
	}

	rafId = requestAnimationFrame(() => {
		const scrollContainer = getScrollContainer();
		if (!scrollContainer) {
			rafId = null;
			return;
		}

		const newScrollTop = scrollContainer.scrollTop;
		const newContainerHeight = scrollContainer.clientHeight;

		if (newScrollTop !== scrollTop.value || newContainerHeight !== containerHeight.value) {
			scrollTop.value = newScrollTop;
			containerHeight.value = newContainerHeight;
		}

		rafId = null;
	});
};

const updateItemHeight = (index: number, height: number) => {
	const currentHeight = itemHeights.value.get(index);
	if (currentHeight !== height && height > 0) {
		itemHeights.value.set(index, height);
		nextTick(() => {
			handleScroll();
		});
	}
};

const resizeObserver = ref<ResizeObserver | null>(null);

const setupResizeObserver = () => {
	const scrollContainer = getScrollContainer();
	
	if (!scrollContainer) {
		return;
	}

	if (resizeObserver.value) {
		resizeObserver.value.disconnect();
	}

	resizeObserver.value = new ResizeObserver(() => {
		handleScroll();
	});

	resizeObserver.value.observe(scrollContainer);
};

const setupScrollListener = () => {
	if (currentScrollContainer) {
		currentScrollContainer.removeEventListener("scroll", handleScroll);
		currentScrollContainer = null;
	}

	const scrollContainer = getScrollContainer();
	if (!scrollContainer) {
		return;
	}

	scrollContainer.addEventListener("scroll", handleScroll, { passive: true });
	currentScrollContainer = scrollContainer;
};

const initialize = () => {
	const scrollContainer = getScrollContainer();
	
	if (!scrollContainer) {
		return;
	}

	const height = scrollContainer.clientHeight;
	const top = scrollContainer.scrollTop;

	if (height > 0) {
		containerHeight.value = height;
	}
	scrollTop.value = top;
	
	setupResizeObserver();
	setupScrollListener();
	handleScroll();
};

onMounted(() => {
	nextTick(() => {
		initialize();

		if (props.loadMore) {
			useIntersectionObserver(
				loadMoreRef,
				async (entries) => {
					if (entries[0]?.isIntersecting && props.hasMore && !props.isLoadingMore && props.loadMore) {
						await props.loadMore();
					}
				},
				{
					threshold: 0.1,
					rootMargin: "200px",
					enabled: computed(() => props.hasMore && !props.isLoadingMore)
				}
			);
		}

		setTimeout(() => {
			initialize();
		}, 100);
	});
});

watch(layoutMainRef, () => {
	nextTick(() => {
		initialize();
	});
});

onBeforeUnmount(() => {
	if (resizeObserver.value) {
		resizeObserver.value.disconnect();
	}
	if (currentScrollContainer) {
		currentScrollContainer.removeEventListener("scroll", handleScroll);
		currentScrollContainer = null;
	}
});

watch(() => props.items.length, () => {
	itemHeights.value.clear();
	nextTick(() => {
		handleScroll();
	});
});

watch(() => props.items, () => {
	nextTick(() => {
		handleScroll();
	});
}, { deep: false });

watch(itemHeights, () => {
	nextTick(() => {
		handleScroll();
	});
}, { deep: true });

defineExpose({
	updateItemHeight,
	scrollToIndex: (index: number) => {
		const scrollContainer = getScrollContainer();
		if (!scrollContainer) {
			return;
		}

		let offset = 0;
		for (let i = 0; i < index; i++) {
			const height = itemHeights.value.get(i) || props.itemHeight;
			offset += height;
		}

		scrollContainer.scrollTop = offset;
	}
});
</script>

<style scoped lang="scss">
.virtual-song-list {
	position: relative;
	width: 100%;
}

.virtual-song-list-spacer {
	flex-shrink: 0;
}

.virtual-song-list-content {
	position: relative;
}

.virtual-song-list-load-more {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 20px;
	min-height: 60px;
}
</style>

