import { useSearchStore } from "~/stores/search";
import type { TSearchCategory } from "~~/server/utils/types";

export const useSearchCategory = (categoryId: string) => {
	const searchStore = useSearchStore();

	const category = computed(() => {
		return searchStore.results?.categories?.find(c => c.id === categoryId);
	});

	const loading = computed(() => searchStore.loading);
	const error = computed(() => searchStore.error);

	const loadMore = async () => {
		if (category.value) {
			await searchStore.loadMoreCategory(categoryId);
		}
	};

	const hasMore = computed(() => {
		if (!category.value?.more) {
			return false;
		}
		return Boolean(category.value.more.section_id && category.value.more.next_from);
	});

	return {
		category,
		loading,
		error,
		loadMore,
		hasMore
	};
};

