import type { TExploreData } from "~~/server/utils/types";

export const useExplore = () => {
	const currentParams = ref<{ count?: number }>({});
	
	const { data: explore, pending: loading, error, execute } = useFetch<TExploreData>("/api/vk/explore");

	const loadExplore = async (newParams: { count?: number } = {}) => {
		currentParams.value = newParams;
		await execute();
	};

	return {
		explore: readonly(explore),
		loading: readonly(loading),
		error: readonly(error),
		loadExplore
	};
};

