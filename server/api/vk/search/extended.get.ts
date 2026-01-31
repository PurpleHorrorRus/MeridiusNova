import { getSearchRequestsInstance } from "./search";

export default defineEventHandler(async (event) => {
	const searchRequests = getSearchRequestsInstance(event);
	const query = getQuery(event);

	if (!query.q) {
		throw createError({
			status: 400,
			message: "Query parameter 'q' is required"
		});
	}

	return await searchRequests.queryExtended(query.q as string, {
		count: query.count ? Number(query.count) : undefined
	});
});

