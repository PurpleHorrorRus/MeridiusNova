import { ref, onMounted, onUnmounted } from "vue";
import { useEventListener } from "~/composables/useEventListener";

const isNativeFullscreen = ref(false);

const checkFullscreen = () => {
	if (typeof document === "undefined") {
		return false;
	}

	return !!(
		document.fullscreenElement ||
		(document as any).webkitFullscreenElement ||
		(document as any).mozFullScreenElement ||
		(document as any).msFullscreenElement
	);
};

const handleFullscreenChange = () => {
	isNativeFullscreen.value = checkFullscreen();
};

export const useNativeFullscreen = () => {
	if (import.meta.client) {
		onMounted(() => {
			isNativeFullscreen.value = checkFullscreen();

			useEventListener(document, "fullscreenchange", handleFullscreenChange);

			document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
			document.addEventListener("mozfullscreenchange", handleFullscreenChange);
			document.addEventListener("MSFullscreenChange", handleFullscreenChange);
		});

		onUnmounted(() => {
			document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
			document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
			document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
		});
	}

	return {
		isNativeFullscreen
	};
};

