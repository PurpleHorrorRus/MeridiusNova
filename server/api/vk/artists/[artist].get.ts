import { getArtistsRequestsInstance } from "./artists";

export default defineCachedEventHandler(async (event) => {
	const artistsRequests = getArtistsRequestsInstance(event);
	const artist = getRouterParam(event, "artist");

	if (!artist) {
		throw createError({
			status: 400,
			message: "Artist parameter is required"
		});
	}

	const query = getQuery(event);

	return await artistsRequests.get(artist, {
		list: query.list === "true"
	});
}, {
	maxAge: 600,
	name: "artist",
	getKey: (event) => {
		const artist = getRouterParam(event, "artist");
		const query = getQuery(event);
		const list = query.list === "true" ? "-list" : "";
		return `artist-${artist}${list}`;
	}
});

