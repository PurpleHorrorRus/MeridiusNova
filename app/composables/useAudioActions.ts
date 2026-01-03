import type { TAudio, TLyrics } from "~~/server/utils/types";
import { createAudioBody } from "~/utils/audio-api";
import { refreshDownloadsQueue } from "~/utils/downloads";
import { authenticatedFetch } from "~/utils/api";

export const useAudioActions = () => {
	const addAudio = async (audio: TAudio) => {
		return await authenticatedFetch<TAudio>("/api/vk/audio/add", {
			method: "POST",
			body: createAudioBody(audio, {
				add_hash: audio.add_hash,
				track_code: audio.track_code
			})
		});
	};

	const deleteAudio = async (audio: TAudio, restore = false) => {
		return await authenticatedFetch<{ success: boolean }>("/api/vk/audio/delete", {
			method: "POST",
			body: createAudioBody(audio, {
				delete_hash: audio.delete_hash,
				track_code: audio.track_code,
				restore
			})
		});
	};

	const editAudio = async (audio: TAudio, params: {
		title?: string;
		performer?: string;
		privacy?: number;
		lyrics?: string;
		genre?: number;
	}) => {
		return await authenticatedFetch<TAudio>("/api/vk/audio/edit", {
			method: "POST",
			body: createAudioBody(audio, {
				edit_hash: audio.edit_hash,
				title: params.title || audio.title,
				performer: params.performer || audio.performer,
				privacy: params.privacy ?? 0,
				lyrics: params.lyrics,
				genre: params.genre
			})
		});
	};

	const getLyrics = async (audio: TAudio) => {
		if (!audio.full_id || !audio.lyrics) {
			return null;
		}

		return await authenticatedFetch<TLyrics>("/api/vk/audio/lyrics", {
			params: {
				full_id: audio.full_id
			}
		});
	};

	const reorderAudio = async (params: {
		audio_id: number;
		next_audio_id: number;
		owner_id?: number;
	}) => {
		return await authenticatedFetch<{ success: boolean }>("/api/vk/audio/reorder", {
			method: "POST",
			body: params
		});
	};

	const downloadAudio = async (audio: TAudio) => {
		const response = await authenticatedFetch<{ success: boolean; downloadId?: string }>("/api/vk/audio/download", {
			method: "POST",
			body: createAudioBody(audio, {
				full_id: audio.full_id
			})
		});

		if (response.success) {
			await refreshDownloadsQueue();
		}

		return response;
	};

	const shareAudio = async (params: {
		attachment: string;
		peer_id?: number;
		message?: string;
		toWall?: boolean;
	}) => {
		if (params.toWall) {
			return await authenticatedFetch<{ success: boolean }>("/api/vk/wall/post", {
				method: "POST",
				body: {
					attachments: params.attachment,
					message: params.message || ""
				}
			});
		}

		return await authenticatedFetch<{ success: boolean }>("/api/vk/messages/send", {
			method: "POST",
			body: {
				attachment: params.attachment,
				peer_id: params.peer_id,
				message: params.message || "",
				random_id: Math.floor(Math.random() * 10000)
			}
		});
	};

	const getSimilarTracks = async (audio: TAudio) => {
		return await authenticatedFetch<{ audios: TAudio[] }>("/api/vk/search/similar", {
			params: {
				audio_id: audio.id,
				audio_owner_id: audio.owner_id
			}
		});
	};

	return {
		addAudio,
		deleteAudio,
		editAudio,
		getLyrics,
		reorderAudio,
		downloadAudio,
		shareAudio,
		getSimilarTracks
	};
};

