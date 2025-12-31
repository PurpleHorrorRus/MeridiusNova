import { getRecommendationsRequestsInstance } from "./recommendations";

export default defineEventHandler(async (event) => {
	const recommendationsRequests = getRecommendationsRequestsInstance(event);
	const query = getQuery(event);

	return await recommendationsRequests.onboarding({
		more: query.next_from
			? {
				section_id: query.section_id as string || "",
				next_from: query.next_from as string,
				start_from: query.start_from as string || query.next_from as string
			}
			: undefined
	});
});

