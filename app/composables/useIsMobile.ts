import { inject, provide, ref, computed, onMounted, onUnmounted, type Ref } from "vue";

const MOBILE_BREAKPOINT = 768;
const IS_MOBILE_KEY = Symbol("isMobile");

export const isMobileCheck = (): boolean => {
	if (typeof window === "undefined") {
		return false;
	}
	return window.innerWidth <= MOBILE_BREAKPOINT;
};

export const useIsMobile = () => {
	const injected = inject<Ref<boolean> | undefined>(IS_MOBILE_KEY, undefined);

	if (injected) {
		return {
			isMobile: injected
		};
	}

	const windowWidth = ref(typeof window !== "undefined" ? window.innerWidth : 0);

	const isMobile = computed(() => {
		if (typeof window === "undefined") {
			return false;
		}
		return windowWidth.value <= MOBILE_BREAKPOINT;
	});

	const handleResize = () => {
		if (typeof window !== "undefined") {
			windowWidth.value = window.innerWidth;
		}
	};

	onMounted(() => {
		if (typeof window !== "undefined") {
			windowWidth.value = window.innerWidth;
			window.addEventListener("resize", handleResize);
		}
	});

	onUnmounted(() => {
		if (typeof window !== "undefined") {
			window.removeEventListener("resize", handleResize);
		}
	});

	provide(IS_MOBILE_KEY, isMobile);

	return {
		isMobile
	};
};

