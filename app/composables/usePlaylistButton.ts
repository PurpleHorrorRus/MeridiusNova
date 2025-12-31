import { computed, ref, type ComputedRef, unref } from "vue";
import type { TPlaylist, TAlbum } from "~~/server/utils/types";

type PlaylistLike = TPlaylist | (TAlbum & { owner_id: number; playlist_id: number }) | null | undefined;
type PlaylistLikeInput = PlaylistLike | ComputedRef<PlaylistLike>;

const getPlaylistRawId = (item: PlaylistLike): string | null => {
	if (!item) {
		return null;
	}

	if ("raw_id" in item && item.raw_id) {
		return item.raw_id;
	}

	if ("owner_id" in item && "playlist_id" in item && item.owner_id && item.playlist_id) {
		return `${item.owner_id}_${item.playlist_id}`;
	}

	return null;
};

const normalizeToPlaylist = (item: PlaylistLike): TPlaylist | null => {
	if (!item) {
		return null;
	}

	if ("raw_id" in item && "owner_id" in item && "playlist_id" in item) {
		return item as TPlaylist;
	}

	if ("owner_id" in item && "playlist_id" in item && item.owner_id && item.playlist_id) {
		return {
			owner_id: item.owner_id,
			playlist_id: item.playlist_id,
			raw_id: `${item.owner_id}_${item.playlist_id}`,
			title: "title" in item ? item.title : "",
			cover_url: "cover_url" in item ? item.cover_url : ("image" in item ? item.image : ""),
			description: "description" in item ? item.description : ("text" in item ? item.text : ""),
			size: "size" in item ? (item.size || 0) : 0,
			listens: 0,
			last_updated: 0,
			explicit: false,
			followed: false,
			official: false,
			restricted: false,
			access_hash: "access_hash" in item ? (item.access_hash || "") : "",
			follow_hash: "",
			edit_hash: ""
		} as TPlaylist;
	}

	return null;
};

export const usePlaylistButton = (playlist: PlaylistLikeInput) => {
	const { playPlaylist, playing } = usePlaylist();
	const playerStore = usePlayerStore();
	const isLoading = ref(false);

	const playlistRawId = computed(() => getPlaylistRawId(unref(playlist)));

	const isCurrentPlaylist = computed(() => {
		const currentPlaying = playing.value;
		if (!currentPlaying || !playlistRawId.value) {
			return false;
		}
		return currentPlaying.raw_id === playlistRawId.value;
	});

	const isPlaying = computed(() => {
		return isCurrentPlaylist.value && !playerStore.paused;
	});

	const isLoadingState = computed(() => {
		return isLoading.value || playerStore.loading;
	});

	const handlePlayPause = async () => {
		const normalizedPlaylist = normalizeToPlaylist(unref(playlist));
		if (!normalizedPlaylist) {
			return;
		}

		if (isCurrentPlaylist.value) {
			if (playerStore.paused) {
				playerStore.resume();
			} else {
				playerStore.pause();
			}
		} else {
			isLoading.value = true;
			await playPlaylist(normalizedPlaylist).finally(() => {
				isLoading.value = false;
			});
		}
	};

	return {
		isPlaying,
		isCurrentPlaylist,
		isLoading: isLoadingState,
		handlePlayPause
	};
};
