export const createAsyncLoader = <T>(
	loader: () => Promise<T>,
	options: {
		onError?: (error: Error) => void;
		defaultValue?: T;
		errorMessage?: string;
	} = {}
) => {
	const loading = ref(false);
	const error = ref<string | null>(null);

	const load = async (): Promise<T> => {
		loading.value = true;
		error.value = null;

		const result = await loader().catch((err: Error) => {
			error.value = err.message || options.errorMessage || "Failed to load";
			if (options.onError) {
				options.onError(err);
			} else {
				console.error("Failed to load:", err);
			}
			return options.defaultValue as T;
		});

		loading.value = false;
		return result;
	};

	return {
		loading: readonly(loading),
		error: readonly(error),
		load
	};
};

