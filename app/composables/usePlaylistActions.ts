import type { TPlaylist, TAudio } from "~~/server/utils/types";

export const usePlaylistActions = () => {
	const createPlaylist = async (params: {
		title: string;
		description?: string;
		cover?: string;
	}) => {
		return await $fetch<TPlaylist>("/api/vk/playlists/create", {
			method: "POST",
			body: params
		});
	};

	const editPlaylist = async (params: {
		playlist_id: number;
		title?: string;
		description?: string;
		cover?: string;
		no_discover?: boolean;
	}) => {
		return await $fetch("/api/vk/playlists/edit", {
			method: "POST",
			body: params
		});
	};

	const deletePlaylist = async (playlist: TPlaylist) => {
		return await $fetch<{ success: boolean }>("/api/vk/playlists/delete", {
			method: "POST",
			body: {
				playlist_id: playlist.playlist_id,
				owner_id: playlist.owner_id,
				edit_hash: playlist.edit_hash
			}
		});
	};

	const followPlaylist = async (playlist: TPlaylist) => {
		return await $fetch("/api/vk/playlists/follow", {
			method: "POST",
			body: {
				playlist_id: playlist.playlist_id,
				owner_id: playlist.owner_id,
				follow_hash: playlist.follow_hash
			}
		});
	};

	const reorderPlaylist = async (params: {
		playlist_id: number;
		prev_playlist_id: number;
	}) => {
		return await $fetch<{ success: boolean }>("/api/vk/playlists/reorder", {
			method: "POST",
			body: params
		});
	};

	const addSongToPlaylist = async (audio: TAudio, playlist: TPlaylist) => {
		return await $fetch("/api/vk/playlists/add-song", {
			method: "POST",
			body: {
				audio_id: audio.id,
				audio_owner_id: audio.owner_id,
				playlist_id: playlist.playlist_id,
				playlist_owner_id: playlist.owner_id
			}
		});
	};

	const removeSongFromPlaylist = async (audio: TAudio, playlist: TPlaylist) => {
		return await $fetch("/api/vk/playlists/remove-song", {
			method: "POST",
			body: {
				audio_id: audio.id,
				audio_owner_id: audio.owner_id,
				playlist_id: playlist.playlist_id,
				playlist_owner_id: playlist.owner_id
			}
		});
	};

	const reorderSongsInPlaylist = async (params: {
		playlist_id: number;
		Audios?: string;
		force?: boolean;
	}) => {
		return await $fetch("/api/vk/playlists/reorder-songs", {
			method: "POST",
			body: params
		});
	};

	const downloadPlaylist = async (playlist: TPlaylist) => {
		const response = await $fetch<{ success: boolean; downloadId?: string }>("/api/vk/playlists/download", {
			method: "POST",
			body: {
				playlist_id: playlist.playlist_id,
				owner_id: playlist.owner_id,
				access_hash: playlist.access_hash
			}
		});

		if (response.success && import.meta.client) {
			const { useDownloadsStore } = await import("~/stores/downloads");
			const downloadsStore = useDownloadsStore();
			await downloadsStore.fetchQueue();
		}

		return response;
	};

	return {
		createPlaylist,
		editPlaylist,
		deletePlaylist,
		followPlaylist,
		reorderPlaylist,
		addSongToPlaylist,
		removeSongFromPlaylist,
		reorderSongsInPlaylist,
		downloadPlaylist
	};
};

