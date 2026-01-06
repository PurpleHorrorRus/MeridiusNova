import { computed, ref, type ComputedRef, unref } from "vue";
import type { TPlaylist, TAlbum } from "~~/server/utils/types";
import { usePlaylistStore } from "~/stores/playlist";
import { usePlayerStore } from "~/stores/player";

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
			title: "title" in item && typeof item.title === "string" ? item.title : "",
			cover_url: "cover_url" in item && typeof item.cover_url === "string" ? item.cover_url : ("image" in item && typeof item.image === "string" ? item.image : ""),
			description: "description" in item && typeof item.description === "string" ? item.description : ("text" in item && typeof item.text === "string" ? item.text : ""),
			size: "size" in item && typeof item.size === "number" ? item.size : 0,
			listens: "listens" in item && typeof item.listens === "number" ? item.listens : 0,
			last_updated: "last_updated" in item && typeof item.last_updated === "number" ? item.last_updated : 0,
			explicit: "explicit" in item && typeof item.explicit === "boolean" ? item.explicit : false,
			followed: "followed" in item && typeof item.followed === "boolean" ? item.followed : false,
			official: "official" in item && typeof item.official === "boolean" ? item.official : false,
			restricted: "restricted" in item && typeof item.restricted === "boolean" ? item.restricted : false,
			access_hash: "access_hash" in item && typeof item.access_hash === "string" ? item.access_hash : "",
			follow_hash: "follow_hash" in item && typeof item.follow_hash === "string" ? item.follow_hash : "",
			edit_hash: "edit_hash" in item && typeof item.edit_hash === "string" ? item.edit_hash : ""
		};

		if ("list" in item && Array.isArray(item.list)) {
			basePlaylist.list = item.list;
		}

		if ("author" in item && item.author && typeof item.author === "object" && "id" in item.author && "name" in item.author) {
			const authorItem = item.author as { id: unknown; name: unknown };
			if ((typeof authorItem.id === "number" || typeof authorItem.id === "string") && typeof authorItem.name === "string") {
				basePlaylist.author = {
					id: authorItem.id,
					name: authorItem.name
				};
			}
		}

		return basePlaylist as TPlaylist;
	}

	return null;
};

export const usePlaylistButton = (playlist: PlaylistLikeInput) => {
	const playlistStore = usePlaylistStore();
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
		const currentPlaying = playlistStore.playing;
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

	const handlePlayPause = async (event?: MouseEvent, randomStart = false) => {
		if (isProcessing.value) {
			return;
		}

		const normalizedPlaylist = normalizeToPlaylist(unref(playlist));
		if (!normalizedPlaylist) {
			return;
		}

		isProcessing.value = true;

		try {
			const currentPlaying = playlistStore.playing;
			const playlistData = currentPlaylistData.value;
			
			const isRandomStart = randomStart || event?.shiftKey || false;
			
			let isSamePlaylist = false;
			const hasSongs = playlistStore.playingSongs.length > 0;
			const hasPlaylistSongs = currentPlaying?.list && currentPlaying.list.length > 0;
			
			// Проверяем, является ли это тем же плейлистом только если есть песни в очереди или в плейлисте
			if (currentPlaying && playlistData && (hasSongs || hasPlaylistSongs)) {
				if (playlistData.raw_id && currentPlaying.raw_id === playlistData.raw_id) {
					isSamePlaylist = true;
				} else if (playlistData.owner_id !== undefined && playlistData.playlist_id !== undefined) {
					isSamePlaylist = currentPlaying.owner_id === playlistData.owner_id && 
						currentPlaying.playlist_id === playlistData.playlist_id;
				}
			}

			// Если это тот же плейлист, есть песни в очереди, и не рандомный старт - пауза/возобновление
			// Если очередь пуста, но плейлист тот же - перезапускаем с установкой очереди
			if (isSamePlaylist && !isRandomStart && hasSongs) {
				const current = playerStore.getCurrentController();
				const isActuallyPaused = current?.controller?.paused ?? playerStore.paused;
				
				if (isActuallyPaused) {
					playerStore.resume();
				} else {
					playerStore.pause();
				}
			} else {
				// Запускаем плейлист (либо новый, либо тот же, но с пустой очередью, либо с рандомом)
				isLoading.value = true;
				await playlistStore.playPlaylist(normalizedPlaylist, 0, isRandomStart).finally(() => {
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

