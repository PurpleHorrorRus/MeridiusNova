import { getAudioRequestsInstance } from "../audio/audio";

export default defineEventHandler(async (event) => {
	const audioRequests = getAudioRequestsInstance(event);
	const body = await readBody(event);

	if (!body.audio_id && body.audio_id !== 0) {
		throw createError({
			status: 400,
			message: "audio_id is required"
		});
	}

	const userId = (event.context.user as any)?.id || 0;
	const owner_id = body.owner_id || userId;

	const reorderHash = await audioRequests.getReorderHash();

	const requestParams = {
		act: "reorder_audios",
		al: 1,
		audio_id: body.audio_id !== undefined ? Number(body.audio_id) : -1,
		hash: reorderHash || "",
		next_audio_id: body.next_audio_id !== undefined ? Number(body.next_audio_id) : 0,
		owner_id
	};

	await audioRequests.request(requestParams);
	return { success: true };
});