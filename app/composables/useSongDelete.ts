import { computed } from "vue";
import { useRoute } from "vue-router";
import type { TAudio, TPlaylist } from "~~/server/utils/types";
import { useAudioActions } from "~/composables/useAudioActions";
import { usePlaylistActions } from "~/composables/usePlaylistActions";
import { usePlaylist } from "~/composables/usePlaylist";
import { usePlaylistStore } from "~/stores/playlist";
import { useVkStore } from "~/stores/vk";
import { useUpdateTrack } from "~/composables/useUpdateTrack";
import { isUserLibraryPage } from "~/utils/route";

export const useSongDelete = () => {
	const { deleteAudio } = useAudioActions();
	const { removeSongFromPlaylist } = usePlaylistActions();
	const { current, playing } = usePlaylist();
	const playlistStore = usePlaylistStore();
	const vkStore = useVkStore();
	const { updateTrackInAllPlaces } = useUpdateTrack();
	const route = useRoute();

	const currentPlaylist = computed(() => {
		return playing.value || current.value;
	});

	const isInLibrary = (audio: TAudio): boolean => {
		return Boolean(audio.addedSong) || audio.owner_id === vkStore.user_id;
	};

	const shouldRemoveFromPlaylist = (audio: TAudio, playlist: TPlaylist | null): boolean => {
		if (!playlist) {
			return false;
		}

		const inLibrary = isInLibrary(audio);

		return playlist.playlist_id >= 0
			&& playlist.owner_id === vkStore.user_id
			&& !inLibrary
			&& !audio.addedSong;
	};


	const handleDelete = async (audio: TAudio): Promise<{ success: boolean } | null> => {
		const playlist = currentPlaylist.value;
		const inLibrary = isInLibrary(audio);
		const removeFromPlaylist = shouldRemoveFromPlaylist(audio, playlist);

		let result: { success: boolean } | null = null;

		if (removeFromPlaylist) {
			if (!playlist) {
				return null;
			}

			result = await removeSongFromPlaylist(audio, playlist).catch(console.error) || null;

			if (result?.success && playlist.size !== undefined) {
				playlist.size = Math.max(0, (playlist.size || 0) - 1);
			}
		} else if (inLibrary) {
			const songToDelete = audio.addedSong || audio;

			result = await deleteAudio(songToDelete).catch(console.error) || null;

			if (result?.success) {
				const userLibraryPage = isUserLibraryPage(route.path);

				if (userLibraryPage) {
					updateTrackInAllPlaces(audio.id, () => null, true);
				} else {
					updateTrackInAllPlaces(audio.id, (track) => {
						const { addedSong, ...trackWithoutAddedSong } = track;
						return {
							...trackWithoutAddedSong,
							can_add: true,
							can_delete: false
						};
					}, false);
				}
			}
		}

		if (result?.success) {
			playlistStore.removeSongByFullId(audio.full_id);

			if (playlistStore.currentSong && playlistStore.currentSong.full_id === audio.full_id) {
				playlistStore.next();
			}
		}

		return result;
	};

	const getDeleteTitle = (audio: TAudio): string => {
		const playlist = currentPlaylist.value;

		if (playlist && playlist.playlist_id >= 0 && playlist.owner_id === vkStore.user_id) {
			return "Удалить из плейлиста";
		}

		return "Удалить из библиотеки";
	};

	const canDelete = (audio: TAudio, songProps: { canDelete: boolean }): boolean => {
		if (songProps.canDelete) {
			return true;
		}

		const playlist = currentPlaylist.value;
		if (playlist && playlist.playlist_id >= 0 && playlist.owner_id === vkStore.user_id) {
			return true;
		}

		return false;
	};

	return {
		isInLibrary,
		shouldRemoveFromPlaylist,
		isUserLibraryPage,
		handleDelete,
		getDeleteTitle,
		canDelete
	};
};

