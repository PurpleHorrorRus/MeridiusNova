import { BaseRequest } from "~~/server/utils/base";
import { getAudioRequestsInstance } from "../audio/audio";

import type { TAudio } from "../audio/types";

type TUpdate = {
	item: {
		id: number;
		name: string;
		photo_max?: string;
		first_name?: string;
		last_name?: string;
	};
	audios: TAudio[];
};

export default defineEventHandler(async (event) => {
	const baseRequest = new BaseRequest(event);
	const audioRequests = getAudioRequestsInstance(event);

	const friendsResponse = await baseRequest.callVKAPI("friends.get", {
		fields: "photo_max,status"
	});

	const friends = (friendsResponse.items || []).filter((friend: any) => {
		return friend.status_audio;
	});

	const updates: TUpdate[] = [];

	for (let i = 0; i < friends.length; i++) {
		const friend = friends[i];
		
		if (!friend.status_audio) {
			continue;
		}

		const audioId = `${friend.status_audio.owner_id}_${friend.status_audio.id}`;
		const audios = await audioRequests.getById({
			ids: audioId
		}).catch(() => []);

		if (audios.length > 0) {
			updates.push({
				item: {
					id: friend.id,
					name: `${friend.first_name} ${friend.last_name}`,
					photo_max: friend.photo_max,
					first_name: friend.first_name,
					last_name: friend.last_name
				},
				audios
			});
		}

		if (i < friends.length - 1) {
			await new Promise(resolve => setTimeout(resolve, 100));
		}
	}

	return updates;
});

