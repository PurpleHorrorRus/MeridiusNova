import { getAudioRequestsInstance } from "~~/server/api/vk/audio/audio";

export default defineEventHandler(async (event) => {
	const query = getQuery(event);

	const ownerId = query.owner_id ? Number(query.owner_id) : undefined;
	const postId = query.post_id ? Number(query.post_id) : undefined;

	if (!ownerId || !postId) {
		throw createError({
			status: 400,
			message: "owner_id and post_id are required"
		});
	}

	const audioRequests = getAudioRequestsInstance(event);
	
	const audios = await audioRequests.getFromWall({
		owner_id: ownerId,
		post_id: postId,
		raw: false
	}).catch((error: Error) => {
		console.error(`[Wall Audio API] Error loading audio from post ${postId}:`, error);
		return [];
	});

	return {
		audios: audios || []
	};
});

