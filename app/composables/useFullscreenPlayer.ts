import { ref } from "vue";

const isFullscreen = ref(false);

export const useFullscreenPlayer = () => {
	const openFullscreen = () => {
		isFullscreen.value = true;
		if (typeof document !== "undefined") {
			document.body.style.overflow = "hidden";
		}
	};

	const closeFullscreen = () => {
		isFullscreen.value = false;
		if (typeof document !== "undefined") {
			document.body.style.overflow = "";
		}
	};

	const toggleFullscreen = () => {
		if (isFullscreen.value) {
			closeFullscreen();
		} else {
			openFullscreen();
		}
	};

	return {
		isFullscreen,
		openFullscreen,
		closeFullscreen,
		toggleFullscreen
	};
};



