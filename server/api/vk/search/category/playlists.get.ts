import { getSearchRequestsInstance } from "../search";

import type { TPlaylist, TMore } from "~~/server/utils/types";

export default defineEventHandler(async (event) => {
	const searchRequests = getSearchRequestsInstance(event);
	const query = getQuery(event);

	if (!query.link) {
		throw createError({
			statusCode: 400,
			message: "Query parameter 'link' is required"
		});
	}

	const nextFrom = query.next_from as string | undefined;

	const result = await searchRequests.loadCategoryPlaylists(
		query.link as string,
		nextFrom
	);

	return {
		playlists: result.playlists,
		more: result.more
	};
});

