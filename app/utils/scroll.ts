export const useScrollTrigger = (element: HTMLElement, callback: () => void) => {
	const onScroll = () => {
		if (!element) {
			console.warn("Element not found");
			return;
		}

		const scrollTop = element.scrollTop;
		const scrollHeight = element.scrollHeight;
		const clientHeight = element.clientHeight;

		if (scrollTop + clientHeight >= scrollHeight - 2) {
			callback();
		}
	};

	element.addEventListener("scroll", onScroll);

	onUnmounted(() => {
		element.removeEventListener("scroll", onScroll);
	});
};