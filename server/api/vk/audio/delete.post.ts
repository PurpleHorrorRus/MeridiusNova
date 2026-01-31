import { getAudioRequestsInstance } from "../audio/audio";

export default defineEventHandler(async (event) => {
	const audioRequests = getAudioRequestsInstance(event);
	const body = await readBody(event);

	if (!body.audio_id || !body.audio_owner_id) {
		throw createError({
			status: 400,
			message: "audio_id and audio_owner_id are required"
		});
	}

	await audioRequests.request({
		act: "delete_audio",
		aid: Number(body.audio_id),
		al: 1,
		hash: body.delete_hash || "",
		oid: Number(body.audio_owner_id),
		restore: body.restore ? 1 : 0,
		track_code: body.track_code || ""
	});

	return { success: true };
});

