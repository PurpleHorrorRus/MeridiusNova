import { getExploreRequestsInstance } from "./explore";

export default defineEventHandler(async (event) => {
	const exploreRequests = getExploreRequestsInstance(event);
	const query = getQuery(event);
	
	const sectionId = query.sectionId as string | null || null;
	
	return await exploreRequests.vkMix(sectionId);
});

