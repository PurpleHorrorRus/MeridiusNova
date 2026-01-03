import { ref, isRef, computed, watch, nextTick, onBeforeUnmount, type Ref } from "vue";

export interface UseIntersectionObserverOptions {
	threshold?: number | number[];
	root?: Element | null | Ref<Element | null>;
	rootMargin?: string;
	enabled?: Ref<boolean> | (() => boolean);
}

export interface UseIntersectionObserverCallback {
	(entries: IntersectionObserverEntry[]): void | Promise<void>;
}

/**
 * Universal composable for IntersectionObserver
 * Can be used for infinite scroll, lazy loading, etc.
 * 
 * @example
 * ```ts
 * const loadMoreRef = ref<HTMLElement | null>(null);
 * const hasMore = computed(() => /* ... *\/);
 * 
 * useIntersectionObserver(
 *   loadMoreRef,
 *   async (entries) => {
 *     if (entries[0]?.isIntersecting) {
 *       await loadMore();
 *     }
 *   },
 *   {
 *     threshold: 0.1,
 *     enabled: hasMore
 *   }
 * );
 * ```
 */
export const useIntersectionObserver = (
	target: Ref<HTMLElement | null>,
	callback: UseIntersectionObserverCallback,
	options: UseIntersectionObserverOptions = {}
) => {
	const {
		threshold = 0.1,
		root: rootOption = null,
		rootMargin = "0px",
		enabled
	} = options;

	const rootRef = isRef(rootOption) ? rootOption : (rootOption !== null ? ref(rootOption) : ref<Element | null>(null));

	let observer: IntersectionObserver | null = null;

	const isEnabled = computed(() => {
		if (enabled === undefined) {
			return true;
		}
		return typeof enabled === "function" ? enabled() : enabled.value;
	});

	const setupObserver = () => {
		if (observer) {
			observer.disconnect();
			observer = null;
		}

		if (!target.value || !isEnabled.value) {
			return;
		}

		const rootValue = isRef(rootOption) ? rootRef.value : rootOption;

		observer = new IntersectionObserver(
			async (entries) => {
				if (isEnabled.value) {
					await callback(entries);
				}
			},
			{
				threshold,
				root: rootValue,
				rootMargin
			}
		);

		observer.observe(target.value);
	};

	const stop = () => {
		if (observer) {
			observer.disconnect();
			observer = null;
		}
	};

	const start = () => {
		if (target.value && isEnabled.value) {
			nextTick(() => {
				setupObserver();
			});
		}
	};

	// Отслеживаем изменения target и enabled
	watch(
		[target, isEnabled, rootRef],
		() => {
			if (target.value && isEnabled.value) {
				nextTick(() => {
					setupObserver();
				});
			} else {
				stop();
			}
		},
		{ immediate: true }
	);

	onBeforeUnmount(() => {
		stop();
	});

	return {
		start,
		stop
	};
};

