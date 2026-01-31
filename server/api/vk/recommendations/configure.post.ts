import { getRecommendationsRequestsInstance } from "./recommendations";

export default defineEventHandler(async (event) => {
	const recommendationsRequests = getRecommendationsRequestsInstance(event);
	const body = await readBody(event);

	if (!body.artists || !Array.isArray(body.artists)) {
		throw createError({
			status: 400,
			message: "Artists array is required"
		});
	}

	if (!body.hash) {
		throw createError({
			status: 400,
			message: "Hash is required"
		});
	}

	return await recommendationsRequests.configure(body.artists, {
		hash: body.hash
	});
});

