import type { TPlaylistCollection } from "~~/server/utils/types";

export const useGeneral = () => {
	const { data: general, pending: loading, error, execute: loadGeneral } = useFetch<TPlaylistCollection[]>("/api/vk/general");

	return {
		general: readonly(general),
		loading: readonly(loading),
		error: readonly(error),
		loadGeneral
	};
};

