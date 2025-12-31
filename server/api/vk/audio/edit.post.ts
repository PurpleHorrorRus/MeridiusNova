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

	const requestParams: Record<string, any> = {
		act: "edit_audio",
		aid: Number(body.audio_id),
		al: 1,
		hash: body.edit_hash || "",
		oid: Number(body.audio_owner_id),
		performer: body.performer || "",
		privacy: body.privacy || 0,
		title: body.title || ""
	};

	if (body.lyrics !== undefined) {
		requestParams.text = body.lyrics;
	}

	if (body.genre !== undefined) {
		requestParams.genre = body.genre;
	}

	const response = await audioRequests.request(requestParams);

	if (response.payload[0] !== 0) {
		throw createError({
			statusCode: 429,
			message: "You're trying to edit a song too often, try again later"
		});
	}

	const audios = await audioRequests.parseAudios(response.payload[1]);
	return audios[0];
});

