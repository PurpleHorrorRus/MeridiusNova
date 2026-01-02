const MOBILE_BREAKPOINT = 768;

export const isMobileCheck = (): boolean => {
	if (typeof window === "undefined") {
		return false;
	}
	return window.innerWidth <= MOBILE_BREAKPOINT;
};

export const useIsMobile = () => {
	const windowWidth = ref(0);

	const isMobile = computed(() => {
		if (typeof window === "undefined") {
			return false;
		}
		return windowWidth.value <= MOBILE_BREAKPOINT;
	});

	onMounted(() => {
		if (typeof window !== "undefined") {
			windowWidth.value = window.innerWidth;

			const handleResize = () => {
				windowWidth.value = window.innerWidth;
			};

			window.addEventListener("resize", handleResize);

			onUnmounted(() => {
				window.removeEventListener("resize", handleResize);
			});
		}
	});

	return {
		isMobile
	};
};

