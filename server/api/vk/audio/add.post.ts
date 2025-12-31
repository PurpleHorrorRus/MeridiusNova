import { getAudioRequestsInstance } from "../audio/audio";

export default defineEventHandler(async (event) => {
	const audioRequests = getAudioRequestsInstance(event);
	const body = await readBody(event);

	if (!body.audio_id || !body.audio_owner_id) {
		throw createError({
			statusCode: 400,
			message: "audio_id and audio_owner_id are required"
		});
	}

	const response = await audioRequests.request({
		act: "add",
		al: 1,
		audio_id: Number(body.audio_id),
		audio_owner_id: Number(body.audio_owner_id),
		from: "user_list",
		group_id: body.audio_owner_id < 0 ? body.audio_owner_id : 0,
		hash: body.add_hash || "",
		track_code: body.track_code || ""
	});

	const audios = await audioRequests.parseAudios([response.payload[1][0]]);
	return audios[0];
});

