import type { TAudio } from "~~/server/utils/types";

export const createAudioBody = (audio: TAudio, additionalFields?: Record<string, any>) => {
	return {
		audio_id: audio.id,
		audio_owner_id: audio.owner_id,
		...additionalFields
	};
};