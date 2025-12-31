import { getSearchRequestsInstance } from "./search";

export default defineEventHandler(async (event) => {
	const searchRequests = getSearchRequestsInstance(event);
	const query = getQuery(event);

	if (!query.q) {
		return [];
	}

	return await searchRequests.hints({
		q: query.q as string
	});
});

