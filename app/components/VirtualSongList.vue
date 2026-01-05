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
// Кэш для offsets - массив накопленных высот для быстрого доступа
const offsetsCache = ref<number[]>([]);

// Пересчитываем кэш offsets только при изменении itemHeights или items.length
const updateOffsetsCache = () => {
	const itemsLength = props.items.length;
	if (itemsLength === 0) {
		offsetsCache.value = [];
		return;
	}

	// Предзаполняем кэш высот стандартным значением для всех элементов, которые еще не измерены
	for (let i = 0; i < itemsLength; i++) {
		if (!itemHeights.value.has(i)) {
			itemHeights.value.set(i, props.itemHeight);
		}
	}

	const offsets: number[] = [0];
	let total = 0;
	for (let i = 0; i < itemsLength; i++) {
		const height = itemHeights.value.get(i) || props.itemHeight;
		total += height;
		offsets.push(total);
	}
	offsetsCache.value = offsets;
};

const totalHeight = computed(() => {
	if (props.items.length === 0) {
		return 0;
	}
	const cache = offsetsCache.value;
	return cache.length > 0 ? cache[cache.length - 1] : 0;
});

const getItemOffset = (index: number): number => {
	if (index <= 0) return 0;
	const cache = offsetsCache.value;
	if (cache.length > index && cache[index] !== undefined) {
		return cache[index];
	}
	// Fallback если кэш не готов
	let offset = 0;
	for (let i = 0; i < index && i < props.items.length; i++) {
		const height = itemHeights.value.get(i) || props.itemHeight;
		offset += height;
	}
	return offset;
};


const visibleRange = computed(() => {
	const itemsLength = props.items.length;
	if (itemsLength === 0 || containerHeight.value === 0) {
		return { start: 0, end: 0 };
	}

	const scrollTopValue = scrollTop.value;
	const containerHeightValue = containerHeight.value;
	const scrollBottom = scrollTopValue + containerHeightValue;
	const cache = offsetsCache.value;

	// Используем бинарный поиск для нахождения первого видимого элемента
	let firstVisibleIndex = -1;
	let lastVisibleIndex = -1;

	if (cache.length > 0) {
		// Бинарный поиск для firstVisibleIndex
		let left = 0;
		let right = itemsLength - 1;
		while (left <= right) {
			const mid = Math.floor((left + right) / 2);
			const itemTop = cache[mid];
			if (itemTop === undefined) break;
			const itemHeight = itemHeights.value.get(mid) || props.itemHeight;
			const itemBottom = itemTop + itemHeight;

			if (itemBottom >= scrollTopValue) {
				firstVisibleIndex = mid;
				right = mid - 1;
			} else {
				left = mid + 1;
			}
		}

		// Линейный поиск для lastVisibleIndex (обычно недалеко от firstVisibleIndex)
		if (firstVisibleIndex >= 0) {
			for (let i = firstVisibleIndex; i < itemsLength; i++) {
				const itemTop = cache[i];
				if (itemTop !== undefined && itemTop <= scrollBottom) {
					lastVisibleIndex = i;
				} else {
					break;
				}
			}
		}
	}

	// Fallback если кэш не готов или поиск не дал результатов
	if (firstVisibleIndex === -1 || lastVisibleIndex === -1) {
		const fallbackEnd = Math.min(itemsLength - 1, props.overscan * 2);
		return { start: 0, end: fallbackEnd };
	}

	const overscanTop = Math.ceil(props.overscan * 0.7);
	const overscanBottom = Math.floor(props.overscan * 0.3);
	const start = Math.max(0, firstVisibleIndex - overscanTop);
	const end = Math.min(itemsLength - 1, lastVisibleIndex + overscanBottom);

	return { start, end };
});

const startIndex = computed(() => visibleRange.value.start);
const endIndex = computed(() => visibleRange.value.end);

const visibleItems = computed(() => {
	const start = startIndex.value;
	const end = endIndex.value;
	if (start < 0 || end < 0 || start > props.items.length || end >= props.items.length) {
		return [];
	}
	return props.items.slice(start, end + 1);
});

const topOffset = computed(() => {
	return getItemOffset(startIndex.value);
});

const bottomOffset = computed(() => {
	const end = endIndex.value;
	const itemsLength = props.items.length;
	
	if (end >= itemsLength - 1 || end < 0) {
		return 0;
	}
	
	const cache = offsetsCache.value;
	if (cache.length > itemsLength) {
		// Используем кэш для быстрого вычисления
		const total = cache[cache.length - 1];
		const endOffset = cache[end + 1];
		if (total !== undefined && endOffset !== undefined) {
			return Math.max(0, total - endOffset);
		}
	}
	
	// Fallback если кэш не готов
	let offset = 0;
	for (let i = end + 1; i < itemsLength; i++) {
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
	if (!props.hasMore) {
		return false;
	}
	const threshold = Math.max(1, Math.ceil(props.overscan * 0.3));
	return endIndex.value >= props.items.length - threshold;
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

const MAX_CACHE_SIZE = 5000;

const cleanupCache = () => {
	if (itemHeights.value.size > MAX_CACHE_SIZE) {
		const itemsToKeep = Math.floor(MAX_CACHE_SIZE * 0.8);
		const entries = Array.from(itemHeights.value.entries());
		const sortedEntries = entries.sort((a, b) => a[0] - b[0]);
		const toKeep = sortedEntries.slice(-itemsToKeep);
		itemHeights.value.clear();
		toKeep.forEach(([index, height]) => {
			itemHeights.value.set(index, height);
		});
	}
};

const updateItemHeight = (index: number, height: number) => {
	const currentHeight = itemHeights.value.get(index);
	if (currentHeight !== height && height > 0) {
		itemHeights.value.set(index, height);
		cleanupCache();
		// Обновляем кэш offsets при изменении высоты элемента
		updateOffsetsCache();
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
	
	// Инициализируем кэш offsets
	updateOffsetsCache();
	
	setupResizeObserver();
	setupScrollListener();
	handleScroll();
};

onMounted(() => {
	nextTick(() => {
		initialize();

		if (props.loadMore) {
			const scrollContainerRef = computed(() => getScrollContainer());
			useIntersectionObserver(
				loadMoreRef,
				async (entries) => {
					const entry = entries[0];
					if (entry?.isIntersecting && props.hasMore && !props.isLoadingMore && props.loadMore) {
						await props.loadMore();
					}
				},
				{
					threshold: 0.1,
					rootMargin: "300px",
					root: scrollContainerRef,
					enabled: computed(() => props.hasMore && !props.isLoadingMore && showLoadMore.value)
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

// Обновляем кэш offsets при изменении items.length
watch(() => props.items.length, (newLength, oldLength) => {
	if (oldLength !== undefined && newLength !== oldLength) {
		if (newLength < oldLength) {
			// Удаляем высоты элементов, которых больше нет
			for (let i = newLength; i < oldLength; i++) {
				itemHeights.value.delete(i);
			}
		}
		updateOffsetsCache();
		nextTick(() => {
			const scrollContainer = getScrollContainer();
			if (scrollContainer) {
				scrollTop.value = scrollContainer.scrollTop;
				containerHeight.value = scrollContainer.clientHeight;
			}
			handleScroll();
		});
	} else if (oldLength === undefined) {
		// Первая инициализация
		updateOffsetsCache();
	}
}, { immediate: true });

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
	will-change: scroll-position;
}

.virtual-song-list-spacer {
	flex-shrink: 0;
	will-change: height;
}

.virtual-song-list-content {
	position: relative;
	will-change: contents;
	contain: layout style paint;
}

.virtual-song-list-load-more {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 20px;
	min-height: 60px;
}
</style>

