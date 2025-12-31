import { getExploreRequestsInstance } from "./explore";

export default defineEventHandler(async (event) => {
	const exploreRequests = getExploreRequestsInstance(event);
	const query = getQuery(event);

	return await exploreRequests.load({
		count: query.count ? Number(query.count) : undefined
	});
});

