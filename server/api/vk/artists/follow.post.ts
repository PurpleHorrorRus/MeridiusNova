import { getArtistsRequestsInstance } from "./artists";

export default defineEventHandler(async (event) => {
	const artistsRequests = getArtistsRequestsInstance(event);
	const body = await readBody(event);

	const artistId = body.artist_id ?? body.artistId;
	const hash = body.hash;

	if (!artistId || !hash) {
		throw createError({
			status: 400,
			message: "artist_id and hash are required"
		});
	}

	const newHash = await artistsRequests.follow({
		id: String(artistId),
		hash: String(hash)
	});

	return { hash: newHash };
});
