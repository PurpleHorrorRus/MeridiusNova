export const useIsTauri = () => {
	const isTauri = computed(() => {
		return typeof window !== "undefined" && "__TAURI__" in window;
	});

	return {
		isTauri
	};
};

