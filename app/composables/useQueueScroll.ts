import { watch, nextTick, type Ref } from "vue";

export const useQueueScroll = (
	tracksContainerRef: Ref<HTMLElement | null>,
	currentIndex: Ref<number> | (() => number),
	isOpen: Ref<boolean> | (() => boolean)
) => {
	const scrollToActiveTrack = async () => {
		const isOpenValue = typeof isOpen === "function" ? isOpen() : isOpen.value;
		if (!isOpenValue) {
			return;
		}

		await nextTick();

		const container = tracksContainerRef.value;
		if (!container) {
			return;
		}

		const currentIndexValue = typeof currentIndex === "function" ? currentIndex() : currentIndex.value;
		if (currentIndexValue < 0) {
			return;
		}

		const activeTrack = container.querySelector(`[data-queue-index="${currentIndexValue}"]`) as HTMLElement;
		if (activeTrack) {
			activeTrack.scrollIntoView({
				behavior: "smooth",
				block: "center"
			});
		}
	};

	watch(
		() => {
			const isOpenValue = typeof isOpen === "function" ? isOpen() : isOpen.value;
			const currentIndexValue = typeof currentIndex === "function" ? currentIndex() : currentIndex.value;
			return { isOpen: isOpenValue, currentIndex: currentIndexValue };
		},
		({ isOpen: isOpenValue, currentIndex: currentIndexValue }) => {
			if (isOpenValue && currentIndexValue >= 0) {
				scrollToActiveTrack();
			}
		}
	);

	return {
		scrollToActiveTrack
	};
};

