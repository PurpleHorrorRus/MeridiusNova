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
		console.log("[IntersectionObserver] setupObserver called", {
			hasTarget: !!target.value,
			isEnabled: isEnabled.value,
			targetElement: target.value
		});

		if (observer) {
			console.log("[IntersectionObserver] Disconnecting existing observer");
			observer.disconnect();
			observer = null;
		}

		if (!target.value || !isEnabled.value) {
			console.log("[IntersectionObserver] Skipping setup - no target or disabled", {
				hasTarget: !!target.value,
				isEnabled: isEnabled.value
			});
			return;
		}

		const rootValue = isRef(rootOption) ? rootRef.value : rootOption;

		console.log("[IntersectionObserver] Creating new observer", {
			threshold,
			root: rootValue,
			rootMargin,
			target: target.value
		});

		observer = new IntersectionObserver(
			async (entries) => {
				console.log("[IntersectionObserver] ⚡ ENTRY OBSERVED ⚡", {
					entriesCount: entries.length,
					isIntersecting: entries[0]?.isIntersecting,
					intersectionRatio: entries[0]?.intersectionRatio,
					boundingClientRect: entries[0]?.boundingClientRect,
					isEnabled: isEnabled.value,
					target: target.value
				});

				if (isEnabled.value) {
					console.log("[IntersectionObserver] ✅ Enabled, calling callback");
					await callback(entries);
				} else {
					console.log("[IntersectionObserver] ❌ Disabled, skipping callback");
				}
			},
			{
				threshold,
				root: rootValue,
				rootMargin
			}
		);

		observer.observe(target.value);
		console.log("[IntersectionObserver] ✅ Observer started observing target", {
			target: target.value,
			targetId: target.value?.id,
			targetClass: target.value?.className,
			threshold,
			root: rootValue
		});
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
			console.log("[IntersectionObserver] Watch triggered", {
				hasTarget: !!target.value,
				isEnabled: isEnabled.value,
				targetElement: target.value
			});

			if (target.value && isEnabled.value) {
				nextTick(() => {
					setupObserver();
				});
			} else {
				console.log("[IntersectionObserver] Stopping observer");
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

