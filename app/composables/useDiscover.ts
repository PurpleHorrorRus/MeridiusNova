export const useDiscover = () => {
	const feed = ref<any[]>([]);
	const friends = ref<any[]>([]);
	const communities = ref<any[]>([]);
	const updates = ref<any[]>([]);
	const loading = ref(false);
	const error = ref<string | null>(null);

	const loadFeed = async () => {
		loading.value = true;
		error.value = null;

		const result = await Promise.resolve([]).catch((err: Error) => {
			error.value = err.message || "Failed to load feed";
			console.error("Failed to load feed:", err);
			return [];
		});

		feed.value = result;
		loading.value = false;
	};

	const loadFriends = async () => {
		loading.value = true;
		error.value = null;

		const result = await Promise.resolve([]).catch((err: Error) => {
			error.value = err.message || "Failed to load friends";
			console.error("Failed to load friends:", err);
			return [];
		});

		friends.value = result;
		loading.value = false;
	};

	const loadCommunities = async () => {
		loading.value = true;
		error.value = null;

		const result = await Promise.resolve([]).catch((err: Error) => {
			error.value = err.message || "Failed to load communities";
			console.error("Failed to load communities:", err);
			return [];
		});

		communities.value = result;
		loading.value = false;
	};

	const loadUpdates = async () => {
		loading.value = true;
		error.value = null;

		const result = await Promise.resolve([]).catch((err: Error) => {
			error.value = err.message || "Failed to load updates";
			console.error("Failed to load updates:", err);
			return [];
		});

		updates.value = result;
		loading.value = false;
	};

	return {
		feed: readonly(feed),
		friends: readonly(friends),
		communities: readonly(communities),
		updates: readonly(updates),
		loading: readonly(loading),
		error: readonly(error),
		loadFeed,
		loadFriends,
		loadCommunities,
		loadUpdates
	};
};

