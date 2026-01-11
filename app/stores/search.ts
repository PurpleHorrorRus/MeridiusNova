import type { TSearchResult, TMore } from "~~/server/utils/types";

export const useSearchStore = defineStore("search", {
	state: () => ({
		query: "",
		results: null as TSearchResult | null,
		loading: false,
		error: null as string | null
	}),

	actions: {
		async search(query: string) {
			if (!query.trim()) {
				this.results = null;
				return;
			}

			this.query = query;
			this.loading = true;
			this.error = null;

			const results = await $fetch<TSearchResult>("/api/vk/search", {
				params: {
					q: query
				}
			}).catch((error: Error) => {
				this.error = error.message || "Search failed";
				return null;
			});

			if (results) {
				this.results = results;
			} else {
				this.results = null;
			}

			this.loading = false;
		},

		async loadMore() {
			if (!this.results?.more || this.loading) {
				return;
			}

			this.loading = true;

			const more = await $fetch<TSearchResult>("/api/vk/search", {
				params: {
					q: this.query,
					...this.results.more
				}
			}).catch((error: Error) => {
				this.error = error.message || "Failed to load more";
				return null;
			});

			if (more && this.results) {
				this.results.audios = [...(this.results.audios || []), ...(more.audios || [])];
				this.results.playlists = [...(this.results.playlists || []), ...(more.playlists || [])];
				this.results.artists = [...(this.results.artists || []), ...(more.artists || [])];
				this.results.more = more.more;
			}

			this.loading = false;
		},

		async loadMoreCategory(categoryId: string) {
			if (!this.results?.categories || this.loading) {
				return;
			}

			const category = this.results.categories.find(categoryItem => categoryItem.id === categoryId);
			if (!category) {
				return;
			}

			// Если есть next функция, используем её
			if (category.next) {
				this.loading = true;

				const updatedCategory = await category.next().catch((error: Error) => {
					this.error = error.message || "Failed to load more";
					return null;
				});

				if (updatedCategory) {
					// Обновляем категорию в массиве
					const categoryIndex = this.results.categories.findIndex(categoryItem => categoryItem.id === categoryId);
					if (categoryIndex >= 0) {
						this.results.categories[categoryIndex] = updatedCategory;
					}
				}

				this.loading = false;
				return;
			}

			// Если next нет, но есть more, загружаем через API
			if (category.more && category.more.section_id && category.more.next_from) {
				this.loading = true;

				const more = await $fetch<{ audios: any[]; more: TMore | null }>("/api/vk/search", {
					params: {
						category_id: category.more.section_id,
						next_from: category.more.next_from
					}
				}).catch((error: Error) => {
					this.error = error.message || "Failed to load more";
					return null;
				});

				if (more && category.audios) {
					// Добавляем новые треки
					category.audios = [...category.audios, ...more.audios];
					// Обновляем more
					category.more = more.more;
				}

				this.loading = false;
			}
		},

		clear() {
			this.query = "";
			this.results = null;
			this.error = null;
		}
	}
});

