import type { TRecommendationsOnboarding } from "~~/server/utils/types";

export const useRecommendations = () => {
	const onboarding = ref<TRecommendationsOnboarding | null>(null);
	const loading = ref(false);
	const error = ref<string | null>(null);

	const loadOnboarding = async (params: { more?: { section_id?: string; next_from?: string; start_from?: string } } = {}) => {
		loading.value = true;
		error.value = null;

		const result = await $fetch<TRecommendationsOnboarding>("/api/vk/recommendations/onboarding", {
			params: params.more
		}).catch((err: Error) => {
			error.value = err.message || "Failed to load recommendations onboarding";
			console.error("Failed to load recommendations onboarding:", err);
			return null;
		});

		if (result) {
			onboarding.value = result;
		}

		loading.value = false;
	};

	const configure = async (artists: number[], hash: string) => {
		loading.value = true;
		error.value = null;

		const result = await $fetch("/api/vk/recommendations/configure", {
			method: "POST",
			body: {
				artists,
				hash
			}
		}).catch((err: Error) => {
			error.value = err.message || "Failed to configure recommendations";
			console.error("Failed to configure recommendations:", err);
			throw err;
		});

		loading.value = false;
		return result;
	};

	return {
		onboarding: readonly(onboarding),
		loading: readonly(loading),
		error: readonly(error),
		loadOnboarding,
		configure
	};
};

