import { getArtistsRequestsInstance } from "./artists";

export default defineCachedEventHandler(async (event) => {
	const artistsRequests = getArtistsRequestsInstance(event);
	const query = getQuery(event);

	if (!query.link) {
		throw createError({
			statusCode: 400,
			message: "link parameter is required"
		});
	}

	return await artistsRequests.collections(query.link as string);
}, {
	maxAge: 600,
	name: "artist-collections",
	getKey: (event) => {
		const query = getQuery(event);
		return `artist-collections-${query.link}`;
	}
});

