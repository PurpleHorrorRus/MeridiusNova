import { getSearchRequestsInstance } from "../search";

import type { TArtist, TMore } from "~~/server/utils/types";

export default defineEventHandler(async (event) => {
	const searchRequests = getSearchRequestsInstance(event);
	const query = getQuery(event);

	if (!query.link) {
		throw createError({
			status: 400,
			message: "Query parameter 'link' is required"
		});
	}

	const nextFrom = query.next_from as string | undefined;

	const result = await searchRequests.loadCategoryArtists(
		query.link as string,
		nextFrom
	);

	return {
		artists: result.artists,
		more: result.more
	};
});

