import { useArtistsStore } from "~/stores/artists";

export const useArtist = () => {
	const artistsStore = useArtistsStore();

	const loadArtist = async (artist: string, withList = false) => {
		await artistsStore.loadArtist(artist, withList);
	};

	return {
		current: computed(() => artistsStore.current),
		loading: computed(() => artistsStore.loading),
		error: computed(() => artistsStore.error),
		loadArtist,
		clear: () => artistsStore.clear()
	};
};

