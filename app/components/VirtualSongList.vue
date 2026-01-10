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
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount, inject, shallowRef, type Ref } from "vue";

import LoadingSpinner from "~/components/LoadingSpinner.vue";

import { useIntersectionObserver } from "~/composables/useIntersectionObserver";
import { useEventListener } from "~/composables/useEventListener";

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
// Используем обычный ref для реактивности в computed
const offsetsCache = ref<number[]>([]);
// Храним ссылку на предыдущий массив items для определения полной смены плейлиста
const previousItemsRef = shallowRef<any[]>([]);

// Индекс с которого нужно пересчитать offsets (для оптимизации)
let invalidatedFromIndex = 0;

// Пересчитываем кэш offsets только при изменении itemHeights или items.length
const updateOffsetsCache = (fromIndex: number = 0) => {
	if (props.items.length === 0) {
		offsetsCache.value = [];
		return;
	}

	// Предзаполняем кэш высот стандартным значением для всех элементов, которые еще не измерены
	for (let i = fromIndex; i < props.items.length; i++) {
		if (!itemHeights.value.has(i)) {
			itemHeights.value.set(i, props.itemHeight);
		}
	}

	// Если кэш пуст или нужно пересчитать с начала
	if (offsetsCache.value.length === 0 || fromIndex === 0) {
		const offsets: number[] = [0];
		let total = 0;
		for (let i = 0; i < props.items.length; i++) {
			total += itemHeights.value.get(i) || props.itemHeight;
			offsets.push(total);
		}
		offsetsCache.value = offsets;
		invalidatedFromIndex = props.items.length;
	} else {
		// Обновляем только измененную часть кэша
		const offsets = offsetsCache.value;
		const baseOffset = fromIndex > 0 ? offsets[fromIndex] || 0 : 0;
		let total = baseOffset;
		
		// Обрезаем массив до нужной длины
		if (offsets.length > fromIndex + 1) {
			offsets.length = fromIndex + 1;
		}
		
		// Пересчитываем offsets начиная с fromIndex
		for (let i = fromIndex; i < props.items.length; i++) {
			total += itemHeights.value.get(i) || props.itemHeight;
			offsets.push(total);
		}
		
		invalidatedFromIndex = props.items.length;
	}
};

const totalHeight = computed(() => {
	if (props.items.length === 0) {
		return 0;
	}
	return offsetsCache.value.length > 0 ? offsetsCache.value[offsetsCache.value.length - 1] : 0;
});

const getItemOffset = (index: number): number => {
	if (index <= 0) return 0;
	if (offsetsCache.value.length > index && offsetsCache.value[index] !== undefined) {
		return offsetsCache.value[index];
	}
	// Fallback если кэш не готов
	let offset = 0;
	for (let i = 0; i < index && i < props.items.length; i++) {
		offset += itemHeights.value.get(i) || props.itemHeight;
	}
	return offset;
};


const visibleRange = computed(() => {
	if (props.items.length === 0 || containerHeight.value === 0) {
		return { start: 0, end: 0 };
	}

	// Используем бинарный поиск для нахождения первого видимого элемента
	let firstVisibleIndex = -1;
	let lastVisibleIndex = -1;

	if (offsetsCache.value && offsetsCache.value.length > 0) {
		// Бинарный поиск для firstVisibleIndex
		let left = 0;
		let right = props.items.length - 1;
		while (left <= right) {
			const mid = Math.floor((left + right) / 2);
			const itemTop = offsetsCache.value[mid];
			if (itemTop === undefined) break;
			const itemBottom = itemTop + (itemHeights.value.get(mid) || props.itemHeight);

			if (itemBottom >= scrollTop.value) {
				firstVisibleIndex = mid;
				right = mid - 1;
			} else {
				left = mid + 1;
			}
		}

		// Линейный поиск для lastVisibleIndex (обычно недалеко от firstVisibleIndex)
		if (firstVisibleIndex >= 0) {
			for (let i = firstVisibleIndex; i < props.items.length; i++) {
				const itemTop = offsetsCache.value[i];
				if (itemTop !== undefined && itemTop <= (scrollTop.value + containerHeight.value)) {
					lastVisibleIndex = i;
				} else {
					break;
				}
			}
		}
	}

	// Fallback если кэш не готов или поиск не дал результатов
	if (firstVisibleIndex === -1 || lastVisibleIndex === -1) {
		return { start: 0, end: Math.min(props.items.length - 1, props.overscan * 2) };
	}

	return {
		start: Math.max(0, firstVisibleIndex - Math.ceil(props.overscan * 0.7)),
		end: Math.min(props.items.length - 1, lastVisibleIndex + Math.floor(props.overscan * 0.3))
	};
});

const startIndex = computed(() => visibleRange.value.start);

const visibleItems = computed(() => {
	const range = visibleRange.value;
	if (range.start < 0 || range.end < 0 || range.start > props.items.length || range.end >= props.items.length) {
		return [];
	}
	
	const result: typeof props.items = [];
	for (let i = range.start; i <= range.end && i < props.items.length; i++) {
		if (props.items[i]) {
			result.push(props.items[i]);
		}
	}
	return result;
});

const bottomOffset = computed(() => {
	if (visibleRange.value.end >= props.items.length - 1 || visibleRange.value.end < 0) {
		return 0;
	}
	
	if (offsetsCache.value.length > props.items.length) {
		const total = offsetsCache.value[offsetsCache.value.length - 1];
		const endOffset = offsetsCache.value[visibleRange.value.end + 1];
		if (total !== undefined && endOffset !== undefined) {
			return Math.max(0, total - endOffset);
		}
	}
	
	let offset = 0;
	for (let i = visibleRange.value.end + 1; i < props.items.length; i++) {
		offset += itemHeights.value.get(i) || props.itemHeight;
	}

	return Math.max(0, offset);
});

const spacerStyle = computed(() => ({
	height: `${getItemOffset(visibleRange.value.start)}px`
}));

const contentStyle = { position: "relative" as const };

const bottomSpacerStyle = computed(() => ({
	height: `${bottomOffset.value}px`
}));

const showLoadMore = computed(() => {
	return props.hasMore && visibleRange.value.end >= props.items.length - Math.max(1, Math.ceil(props.overscan * 0.3));
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

		// Сортируем и оставляем только нужные элементы без промежуточных массивов
		const sortedEntries = Array.from(itemHeights.value.entries()).sort((a, b) => a[0] - b[0]);
		itemHeights.value.clear();

		// Используем slice напрямую без промежуточной переменной
		for (let i = sortedEntries.length - itemsToKeep; i < sortedEntries.length; i++) {
			if (sortedEntries[i]) {
				itemHeights.value.set(sortedEntries[i]![0], sortedEntries[i]![1]);
			}
		}
	}
};

// Полная очистка кэша при смене плейлиста
const clearCache = () => {
	itemHeights.value.clear();
	offsetsCache.value = [];
	previousItemsRef.value = [];
	invalidatedFromIndex = 0;
	if (updateCacheRafId !== null) {
		cancelAnimationFrame(updateCacheRafId);
		updateCacheRafId = null;
	}
};

let updateCacheRafId: number | null = null;

const updateItemHeight = (index: number, height: number) => {
	if (itemHeights.value.get(index) !== height && height > 0) {
		itemHeights.value.set(index, height);
		cleanupCache();
		
		// Отмечаем что нужно обновить кэш с этого индекса
		if (index < invalidatedFromIndex) {
			invalidatedFromIndex = index;
		}
		
		// Debounce обновление кэша через requestAnimationFrame
		if (updateCacheRafId === null) {
			updateCacheRafId = requestAnimationFrame(() => {
				updateOffsetsCache(invalidatedFromIndex);
				invalidatedFromIndex = props.items.length;
				updateCacheRafId = null;
				handleScroll();
			});
		}
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

const scrollContainerRef = computed(() => getScrollContainer());

const initialize = () => {
	const scrollContainer = getScrollContainer();
	
	if (!scrollContainer) {
		return;
	}

	if (scrollContainer.clientHeight > 0) {
		containerHeight.value = scrollContainer.clientHeight;
	}

	scrollTop.value = scrollContainer.scrollTop;
	
	// Инициализируем кэш offsets
	invalidatedFromIndex = 0;
	updateOffsetsCache(0);
	invalidatedFromIndex = props.items.length;
	
	setupResizeObserver();
	setupScrollListener();
	handleScroll();
};

if (props.loadMore) {
	useIntersectionObserver(loadMoreRef, async entries => {
		if (entries[0] && props.hasMore && !props.isLoadingMore && props.loadMore) {
			await props.loadMore();
		}
	}, {
		threshold: 0.1,
		rootMargin: "300px",
		root: scrollContainerRef,
		enabled: computed(() => props.hasMore && !props.isLoadingMore && showLoadMore.value)
	});
}

onMounted(() => {
	nextTick(() => {
		initialize();
		setTimeout(initialize, 100);
	});
});

watch(layoutMainRef, () => {
	nextTick(initialize);
});

onBeforeUnmount(() => {
	if (resizeObserver.value) {
		resizeObserver.value.disconnect();
		resizeObserver.value = null;
	}
	if (currentScrollContainer) {
		currentScrollContainer.removeEventListener("scroll", handleScroll);
		currentScrollContainer = null;
	}
	// Очищаем кэш при размонтировании для освобождения памяти
	clearCache();
});

// Определяем, полностью ли сменился плейлист (не просто изменилась длина)
const isPlaylistChanged = (newItems: any[], oldItems: any[]): boolean => {
	if ((oldItems.length === 0 && newItems.length > 0) || (newItems.length === 0 && oldItems.length > 0)) {
		return true;
	}
	
	// Если длина сильно изменилась (больше чем на 50%), считаем что плейлист сменился
	if (Math.abs(newItems.length - oldItems.length) > Math.max(oldItems.length * 0.5, 100)) {
		return true;
	}
	
	// Проверяем первые и последние элементы напрямую без промежуточных переменных
	if (newItems.length > 0 && oldItems.length > 0) {
		return (newItems[0]?.full_id && oldItems[0]?.full_id && newItems[0].full_id !== oldItems[0].full_id) ||
			(newItems[newItems.length - 1]?.full_id && oldItems[oldItems.length - 1]?.full_id && 
			 newItems[newItems.length - 1].full_id !== oldItems[oldItems.length - 1].full_id);
	}
	
	return false;
};

// Обновляем кэш offsets при изменении items.length
watch(() => props.items.length, (newLength, oldLength) => {
	if (oldLength !== undefined && newLength !== oldLength) {
		if (newLength < oldLength) {
			// Удаляем высоты элементов, которых больше нет
			for (let i = newLength; i < oldLength; i++) {
				itemHeights.value.delete(i);
			}
		}

		invalidatedFromIndex = Math.min(invalidatedFromIndex, newLength);
		updateOffsetsCache(invalidatedFromIndex);
		invalidatedFromIndex = props.items.length;

		nextTick(() => {
			const scrollContainer = getScrollContainer();

			if (scrollContainer) {
				scrollTop.value = scrollContainer.scrollTop;
				containerHeight.value = scrollContainer.clientHeight;
				handleScroll();
			}
		});
	} else if (oldLength === undefined) {
		// Первая инициализация
		invalidatedFromIndex = 0;
		updateOffsetsCache(0);
		invalidatedFromIndex = props.items.length;
	}
}, { immediate: true });

// Отслеживаем полную смену плейлиста для очистки кэша
watch(() => props.items, (newItems) => {
	if (isPlaylistChanged(newItems, previousItemsRef.value)) {
		// Полностью очищаем кэш при смене плейлиста для освобождения памяти
		clearCache();
		invalidatedFromIndex = 0;
		updateOffsetsCache(0);
		invalidatedFromIndex = props.items.length;

		nextTick(() => {
			const scrollContainer = getScrollContainer();
			if (scrollContainer) {
				scrollTop.value = 0;
				containerHeight.value = scrollContainer.clientHeight;
				handleScroll();
			}
		});
	} else {
		// Обновляем кэш даже если плейлист не сменился полностью (например, добавили/удалили треки)
		invalidatedFromIndex = 0;
		updateOffsetsCache(0);
		invalidatedFromIndex = props.items.length;
	}
	previousItemsRef.value = newItems;
}, { deep: false });

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

