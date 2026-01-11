import { getAudioRequestsInstance } from "./audio";

export default defineEventHandler(async (event) => {
	const body = await readBody(event);

	if (!body.audio_ids) {
		throw createError({
			statusCode: 400,
			message: "audio_ids is required"
		});
	}

	const audioIds = typeof body.audio_ids === "string" 
		? body.audio_ids.split(",").map(id => id.trim())
		: body.audio_ids;

	const audioRequests = getAudioRequestsInstance(event);
	
	const rawAudios = await audioRequests.reloadAudios(audioIds);

	if (!rawAudios || !Array.isArray(rawAudios) || rawAudios.length === 0) {
		return [];
	}

	const audios = await audioRequests.parseAudios(rawAudios, {
		raw: false
	});

	return audios;
});

