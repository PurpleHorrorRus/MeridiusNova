import type { TAudio } from "~~/server/utils/types";

export const createAudioFromIds = (id: number, ownerId: number): TAudio => {
	return {
		id,
		owner_id: ownerId,
		full_id: `${ownerId}_${id}`
	} as TAudio;
};

