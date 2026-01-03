import { computed } from "vue";
import { usePlaylistStore } from "~/stores/playlist";
import { usePlaylist } from "~/composables/usePlaylist";
import type { TPlaylist } from "~~/server/utils/types";

export const useQueueInfo = () => {
	const playlistStore = usePlaylistStore();
	const { current, playing } = usePlaylist();

	const currentPlaylist = computed(() => {
		if (playlistStore.playing) {
			return playlistStore.playing;
		}

		if (playlistStore.current && playlistStore.playingSongs.length > 0) {
			return playlistStore.current;
		}

		return null;
	});

	const getPlaylistSource = (playlist: TPlaylist | null) => {
		if (!playlist) {
			return { title: "", description: "", canNavigate: false, link: undefined };
		}

		return {
			title: playlist.title || "",
			description: playlist.description || "",
			canNavigate: !!playlist.link,
			link: playlist.link
		};
	};

	const playlistSource = computed(() => getPlaylistSource(currentPlaylist.value));

	const formatListens = (listens: number): string => {
		if (listens >= 1000000) {
			return `${(listens / 1000000).toFixed(1)}M`;
		}
		if (listens >= 1000) {
			return `${(listens / 1000).toFixed(1)}K`;
		}
		return String(listens);
	};

	return {
		currentPlaylist,
		playlistSource,
		formatListens
	};
};

