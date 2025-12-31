import { getPlaylistsRequestsInstance } from "../playlists/playlists";

export default defineEventHandler(async (event) => {
	const playlistsRequests = getPlaylistsRequestsInstance(event);
	const body = await readBody(event);

	if (!body.playlist_id || !body.owner_id || !body.follow_hash) {
		throw createError({
			statusCode: 400,
			message: "playlist_id, owner_id and follow_hash are required"
		});
	}

	return await playlistsRequests.follow({
		playlist_id: body.playlist_id,
		owner_id: body.owner_id,
		follow_hash: body.follow_hash
	} as any);
});

