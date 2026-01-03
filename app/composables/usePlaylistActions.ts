import type { TPlaylist, TAudio } from "~~/server/utils/types";
import { createAudioBody } from "~/utils/audio-api";
import { refreshDownloadsQueue } from "~/utils/downloads";
import { authenticatedFetch } from "~/utils/api";

export const usePlaylistActions = () => {
	const createPlaylist = async (params: {
		title: string;
		description?: string;
		cover?: string;
	}) => {
		return await authenticatedFetch<TPlaylist>("/api/vk/playlists/create", {
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
		return await authenticatedFetch("/api/vk/playlists/edit", {
			method: "POST",
			body: params
		});
	};

	const deletePlaylist = async (playlist: TPlaylist) => {
		return await authenticatedFetch<{ success: boolean }>("/api/vk/playlists/delete", {
			method: "POST",
			body: {
				playlist_id: playlist.playlist_id,
				owner_id: playlist.owner_id,
				edit_hash: playlist.edit_hash
			}
		});
	};

	const followPlaylist = async (playlist: TPlaylist) => {
		return await authenticatedFetch("/api/vk/playlists/follow", {
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
		return await authenticatedFetch<{ success: boolean }>("/api/vk/playlists/reorder", {
			method: "POST",
			body: params
		});
	};

	const addSongToPlaylist = async (audio: TAudio, playlist: TPlaylist) => {
		return await authenticatedFetch("/api/vk/playlists/add-song", {
			method: "POST",
			body: {
				...createAudioBody(audio),
				playlist_id: playlist.playlist_id,
				playlist_owner_id: playlist.owner_id
			}
		});
	};

	const removeSongFromPlaylist = async (audio: TAudio, playlist: TPlaylist) => {
		return await authenticatedFetch("/api/vk/playlists/remove-song", {
			method: "POST",
			body: {
				...createAudioBody(audio),
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
		return await authenticatedFetch("/api/vk/playlists/reorder-songs", {
			method: "POST",
			body: params
		});
	};

	const downloadPlaylist = async (playlist: TPlaylist) => {
		const isTauri = typeof window !== "undefined" && "__TAURI__" in window;
		const clientType = isTauri ? "tauri" : "browser";

		const response = await authenticatedFetch<{ success: boolean; downloadId?: string }>("/api/vk/playlists/download", {
			method: "POST",
			headers: {
				"X-Client-Type": clientType
			},
			body: {
				playlist_id: playlist.playlist_id,
				owner_id: playlist.owner_id,
				access_hash: playlist.access_hash
			}
		});

		if (response.success) {
			await refreshDownloadsQueue();
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

