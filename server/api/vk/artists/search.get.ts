import { getArtistsRequestsInstance } from "./artists";

export default defineEventHandler(async (event) => {
	const artistsRequests = getArtistsRequestsInstance(event);
	const query = getQuery(event);

	if (!query.q) {
		throw createError({
			status: 400,
			message: "q parameter is required"
		});
	}

	return await artistsRequests.search(query.q as string, {
		more: query.next_from
			? {
				section_id: query.section_id as string || "",
				next_from: query.next_from as string,
				start_from: query.start_from as string || query.next_from as string
			}
			: undefined
	});
});

