import type { TAudio, TLyrics } from "~~/server/utils/types";
import { authenticatedFetch } from "~/utils/api";
import { useDownloadsStore } from "~/stores/downloads";

const createAudioBody = (audio: TAudio, additionalFields?: Record<string, any>) => {
	return {
		audio_id: audio.id,
		audio_owner_id: audio.owner_id,
		...additionalFields
	};
};

export const useAudioStore = defineStore("audio", {
	actions: {
		async addAudio(audio: TAudio) {
			return await authenticatedFetch<TAudio>("/api/vk/audio/add", {
				method: "POST",
				body: createAudioBody(audio, {
					add_hash: audio.add_hash,
					track_code: audio.track_code
				})
			});
		},

		async deleteAudio(audio: TAudio, restore = false) {
			return await authenticatedFetch<{ success: boolean }>("/api/vk/audio/delete", {
				method: "POST",
				body: createAudioBody(audio, {
					delete_hash: audio.delete_hash,
					track_code: audio.track_code,
					restore
				})
			});
		},

		async editAudio(audio: TAudio, params: {
			title?: string;
			performer?: string;
			privacy?: number;
			lyrics?: string;
			genre?: number;
		}) {
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
		},

		async getLyrics(audio: TAudio) {
			if (!audio.full_id || !audio.lyrics) {
				return null;
			}

			return await authenticatedFetch<TLyrics>("/api/vk/audio/lyrics", {
				params: {
					full_id: audio.full_id
				}
			});
		},

		async reorderAudio(params: {
			audio_id: number;
			next_audio_id: number;
			owner_id?: number;
		}) {
			return await authenticatedFetch<{ success: boolean }>("/api/vk/audio/reorder", {
				method: "POST",
				body: params
			});
		},

		async downloadAudio(audio: TAudio) {
			const response = await authenticatedFetch<{ success: boolean; downloadId?: string }>("/api/vk/audio/download", {
				method: "POST",
				body: createAudioBody(audio, {
					full_id: audio.full_id
				})
			});

			if (response.success) {
				const downloadsStore = useDownloadsStore();
				await downloadsStore.fetchQueue();
			}

			return response;
		},

		async shareAudio(params: {
			attachment: string;
			peer_id?: number;
			message?: string;
			toWall?: boolean;
		}) {
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
		},

		async getSimilarTracks(audio: TAudio) {
			return await authenticatedFetch<{ audios: TAudio[] }>("/api/vk/search/similar", {
				params: {
					audio_id: audio.id,
					audio_owner_id: audio.owner_id
				}
			});
		}
	}
});

