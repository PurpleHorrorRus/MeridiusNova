import { getAudioRequestsInstance } from "./audio";

export default defineEventHandler(async (event) => {
	const token = getCookie(event, "token");

	if (!token) {
		throw createError({
			statusCode: 401,
			statusMessage: "Unauthorized - authentication required. Please ensure cookies are being sent with the request."
		});
	}

	const query = getQuery<{ ids: string }>(event);

	if (!query.ids) {
		throw createError({
			statusCode: 400,
			statusMessage: "Parameter 'ids' is required"
		});
	}

	const audioRequests = getAudioRequestsInstance(event);

	// Получаем URL для указанных ID треков
	const rawAudios = await audioRequests.getById({ ids: query.ids });

	if (!rawAudios || rawAudios.length === 0) {
		return [];
	}

	// Парсим аудио с полученными URL
	const audios = await audioRequests.parseAudios(rawAudios, {
		raw: false
	});

	return audios;
});

