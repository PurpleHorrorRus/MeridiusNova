import { useVkStore } from "~/stores/vk";
import type { TAudio } from "~~/server/utils/types";

export const useSongProps = () => {
	const vkStore = useVkStore();

	const generateSongProps = (song: TAudio) => {
		const userId = vkStore.user_id;
		const isRestricted = Boolean(song.is_restriction);
		const isAdded = Boolean(song.added);
		const canDelete = Boolean(song.can_delete);
		const canAdd = Boolean(song.can_add);
		const isMySong = song.owner_id === userId;

		return {
			canAdd: !isAdded && !isRestricted && !isMySong && canAdd,
			canDelete: isAdded && canDelete,
			canAddPlaylist: !isRestricted,
			canEdit: Boolean(song.can_edit),
			canShare: !isRestricted,
			hasLyrics: Boolean(song.lyrics),
			isRestricted
		};
	};

	return {
		generateSongProps
	};
};

