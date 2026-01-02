import type { TAudio } from "~~/server/utils/types";
import { useAudioActions } from "~/composables/useAudioActions";
import { useUpdateTrack } from "~/composables/useUpdateTrack";
import { useVkStore } from "~/stores/vk";

export const useSongAdd = () => {
	const { addAudio } = useAudioActions();
	const { updateTrackInAllPlaces } = useUpdateTrack();
	const vkStore = useVkStore();

	const handleAdd = async (audio: TAudio): Promise<void> => {
		const audioForApi = audio.owner_id !== vkStore.user_id
			? audio
			: {
				...audio,
				owner_id: (audio as any).original_owner_id || audio.owner_id,
				full_id: `${(audio as any).original_owner_id || audio.owner_id}_${audio.id}`
			};

		const updatedSong = await addAudio(audioForApi).catch(console.error);

		if (updatedSong) {
			const updatedTrack = {
				...audio,
				addedSong: updatedSong,
				can_add: updatedSong.can_add,
				can_delete: updatedSong.can_delete
			};

			updateTrackInAllPlaces(audio.id, () => updatedTrack, false);
		}
	};

	return {
		handleAdd
	};
};

