const createLoader = (loader: () => Promise<any[]>, errorMessage: string) => {
	const loading = ref(false);
	const error = ref<string | null>(null);
	const data = ref<any[]>([]);

	const load = async () => {
		loading.value = true;
		error.value = null;

		const result = await loader().catch((err: Error) => {
			error.value = err.message || errorMessage;
			console.error(errorMessage, err);
			return [];
		});

		data.value = result;
		loading.value = false;
	};

	return {
		data: readonly(data),
		loading: readonly(loading),
		error: readonly(error),
		load
	};
};

import { computed, readonly, ref } from "vue";

const createLoader = (loader: () => Promise<any[]>, errorMessage: string) => {
	const loading = ref(false);
	const error = ref<string | null>(null);
	const data = ref<any[]>([]);

	const load = async () => {
		loading.value = true;
		error.value = null;

		const result = await loader().catch((err: Error) => {
			error.value = err.message || errorMessage;
			console.error(errorMessage, err);
			return [];
		});

		data.value = result;
		loading.value = false;
	};

	return {
		data: readonly(data),
		loading: readonly(loading),
		error: readonly(error),
		load
	};
};

export const useDiscover = () => {
	const feedLoader = createLoader(() => Promise.resolve([]), "Failed to load feed");
	const friendsLoader = createLoader(() => Promise.resolve([]), "Failed to load friends");
	const communitiesLoader = createLoader(() => Promise.resolve([]), "Failed to load communities");
	const updatesLoader = createLoader(() => Promise.resolve([]), "Failed to load updates");

	return {
		feed: feedLoader.data,
		friends: friendsLoader.data,
		communities: communitiesLoader.data,
		updates: updatesLoader.data,
		loading: computed(() => feedLoader.loading.value || friendsLoader.loading.value || communitiesLoader.loading.value || updatesLoader.loading.value),
		error: computed(() => feedLoader.error.value || friendsLoader.error.value || communitiesLoader.error.value || updatesLoader.error.value),
		loadFeed: feedLoader.load,
		loadFriends: friendsLoader.load,
		loadCommunities: communitiesLoader.load,
		loadUpdates: updatesLoader.load
	};
};

