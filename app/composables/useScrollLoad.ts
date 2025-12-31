import { ref, onMounted, onBeforeUnmount, type Ref } from "vue";

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

	const getContainer = (): HTMLElement | null => {
		if (providedContainer) {
			return providedContainer;
		}
		if (containerRef.value) {
			return containerRef.value;
		}
		return document.querySelector(".layout-main") as HTMLElement | null;
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

	onMounted(() => {
		// Даем время на рендеринг, чтобы контейнер точно был в DOM
		setTimeout(() => {
			const container = getContainer();
			if (container) {
				container.addEventListener("scroll", handleScroll, { passive: true });
				containerRef.value = container;
				handleScroll();
			}
		}, 100);
	});

	onBeforeUnmount(() => {
		const container = containerRef.value || getContainer();
		if (container) {
			container.removeEventListener("scroll", handleScroll);
		}
	});

	return {
		containerRef
	};
};

