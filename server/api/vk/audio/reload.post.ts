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

	console.log(`[Reload API] Requested audio IDs:`, audioIds);

	const audioRequests = getAudioRequestsInstance(event);
	
	const rawAudios = await audioRequests.reloadAudios(audioIds);

	console.log(`[Reload API] Raw audios received:`, rawAudios?.length || 0);

	if (!rawAudios || !Array.isArray(rawAudios) || rawAudios.length === 0) {
		console.log(`[Reload API] No raw audios, returning empty array`);
		return [];
	}

	const audios = await audioRequests.parseAudios(rawAudios, {
		raw: false
	});

	console.log(`[Reload API] Parsed audios:`, audios?.length || 0);

	return audios;
});

