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

	if ("owner_id" in item && "playlist_id" in item && item.owner_id !== undefined && item.playlist_id !== undefined) {
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

	if ("owner_id" in item && "playlist_id" in item && item.owner_id !== undefined && item.playlist_id !== undefined) {
		const basePlaylist: Partial<TPlaylist> = {
			owner_id: item.owner_id,
			playlist_id: item.playlist_id,
			raw_id: `${item.owner_id}_${item.playlist_id}`,
			title: "title" in item ? item.title : "",
			cover_url: "cover_url" in item ? item.cover_url : ("image" in item ? item.image : ""),
			description: "description" in item ? item.description : ("text" in item ? item.text : ""),
			size: "size" in item ? (item.size || 0) : 0,
			listens: "listens" in item ? (item.listens || 0) : 0,
			last_updated: "last_updated" in item ? (item.last_updated || 0) : 0,
			explicit: "explicit" in item ? (item.explicit || false) : false,
			followed: "followed" in item ? (item.followed || false) : false,
			official: "official" in item ? (item.official || false) : false,
			restricted: "restricted" in item ? (item.restricted || false) : false,
			access_hash: "access_hash" in item ? (item.access_hash || "") : "",
			follow_hash: "follow_hash" in item ? (item.follow_hash || "") : "",
			edit_hash: "edit_hash" in item ? (item.edit_hash || "") : ""
		};

		if ("list" in item && item.list) {
			basePlaylist.list = item.list;
		}

		if ("author" in item && item.author) {
			basePlaylist.author = item.author;
		}

		return basePlaylist as TPlaylist;
	}

	return null;
};

export const usePlaylistButton = (playlist: PlaylistLikeInput) => {
	const { playPlaylist, playing } = usePlaylist();
	const playerStore = usePlayerStore();
	const isLoading = ref(false);
	const isProcessing = ref(false);

	const playlistRawId = computed(() => getPlaylistRawId(unref(playlist)));

	const currentPlaylistData = computed(() => {
		const playlistItem = unref(playlist);
		if (!playlistItem) {
			return null;
		}
		return {
			owner_id: "owner_id" in playlistItem ? playlistItem.owner_id : undefined,
			playlist_id: "playlist_id" in playlistItem ? playlistItem.playlist_id : undefined,
			raw_id: playlistRawId.value
		};
	});

	const isCurrentPlaylist = computed(() => {
		const currentPlaying = playing.value;
		const playlistData = currentPlaylistData.value;
		
		if (!currentPlaying || !playlistData) {
			return false;
		}

		if (playlistData.raw_id && currentPlaying.raw_id === playlistData.raw_id) {
			return true;
		}

		if (playlistData.owner_id !== undefined && playlistData.playlist_id !== undefined) {
			return currentPlaying.owner_id === playlistData.owner_id && 
				currentPlaying.playlist_id === playlistData.playlist_id;
		}

		return false;
	});

	const isPlaying = computed(() => {
		return isCurrentPlaylist.value && !playerStore.paused;
	});

	const isLoadingState = computed(() => {
		return isLoading.value || playerStore.loading;
	});

	const handlePlayPause = async () => {
		if (isProcessing.value) {
			return;
		}

		const normalizedPlaylist = normalizeToPlaylist(unref(playlist));
		if (!normalizedPlaylist) {
			return;
		}

		isProcessing.value = true;

		try {
			const currentPlaying = playing.value;
			const playlistData = currentPlaylistData.value;
			
			let isSamePlaylist = false;
			
			if (currentPlaying && playlistData) {
				if (playlistData.raw_id && currentPlaying.raw_id === playlistData.raw_id) {
					isSamePlaylist = true;
				} else if (playlistData.owner_id !== undefined && playlistData.playlist_id !== undefined) {
					isSamePlaylist = currentPlaying.owner_id === playlistData.owner_id && 
						currentPlaying.playlist_id === playlistData.playlist_id;
				}
			}

			if (isSamePlaylist) {
				const current = playerStore.getCurrentController();
				const isActuallyPaused = current?.controller?.paused ?? playerStore.paused;
				
				if (isActuallyPaused) {
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
		} finally {
			isProcessing.value = false;
		}
	};

	return {
		isPlaying,
		isCurrentPlaylist,
		isLoading: isLoadingState,
		handlePlayPause
	};
};
