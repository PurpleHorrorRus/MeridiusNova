import type { TAudio } from "~~/server/utils/types";

export const navigateToSimilarTracks = (audio: TAudio): void => {
	navigateTo(`/songs/${audio.id}?audio_owner_id=${audio.owner_id}`);
};

