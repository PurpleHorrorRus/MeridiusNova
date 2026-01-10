import { ref, onMounted, onBeforeUnmount, inject, type Ref } from "vue";

import { useEventListener } from "./useEventListener";

export interface UseScrollLoadOptions {
	threshold?: number;
	enabled?: Ref<boolean> | (() => boolean);
	container?: HTMLElement | null;
}

export const useScrollLoad = (
	loadMore: () => Promise<void> | void,
	options: UseScrollLoadOptions = {}
) => {
	const {
		threshold = 200,
		enabled,
		container: providedContainer
	} = options;

	const containerRef = ref<HTMLElement | null>(null);
	const layoutMainRef = inject<Ref<HTMLElement | null>>("layoutMainRef", ref(null));

	const getContainer = (): HTMLElement | null => {
		if (providedContainer) {
			return providedContainer;
		}
		if (containerRef.value) {
			return containerRef.value;
		}
		return layoutMainRef.value;
	};

	const isEnabled = (): boolean => {
		if (enabled === undefined) {
			return true;
		}
		return typeof enabled === "function" ? enabled() : enabled.value;
	};

	const handleScroll = () => {
		if (!isEnabled()) {
			return;
		}

		const container = getContainer();
		if (!container) {
			return;
		}

		const scrollTop = container.scrollTop;
		const scrollHeight = container.scrollHeight;
		const clientHeight = container.clientHeight;
		const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

		if (distanceFromBottom <= threshold) {
			loadMore();
		}
	};

	const containerElement = ref<HTMLElement | null>(null);

	onMounted(() => {
		// Даем время на рендеринг, чтобы контейнер точно был в DOM
		setTimeout(() => {
			const container = getContainer();
			if (container) {
				containerElement.value = container;
				useEventListener(container, "scroll", handleScroll, { passive: true });
				containerRef.value = container;
				handleScroll();
			}
		}, 100);
	});

	return {
		containerRef
	};
};