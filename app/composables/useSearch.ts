import { useSearchStore } from "~/stores/search";

export const useSearch = () => {
	const searchStore = useSearchStore();

	const search = async (query: string) => {
		await searchStore.search(query);
	};

	const loadMore = async () => {
		await searchStore.loadMore();
	};

	const loadMoreCategory = async (categoryId: string) => {
		await searchStore.loadMoreCategory(categoryId);
	};

	return {
		query: computed(() => searchStore.query),
		results: computed(() => searchStore.results),
		loading: computed(() => searchStore.loading),
		error: computed(() => searchStore.error),
		search,
		loadMore,
		loadMoreCategory,
		clear: () => searchStore.clear()
	};
};

