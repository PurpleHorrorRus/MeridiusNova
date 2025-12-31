import { getPlaylistsRequestsInstance } from "../playlists/playlists";

export default defineEventHandler(async (event) => {
	const playlistsRequests = getPlaylistsRequestsInstance(event);
	const body = await readBody(event);

	if (!body.playlist_id || body.prev_playlist_id === undefined) {
		throw createError({
			statusCode: 400,
			message: "playlist_id and prev_playlist_id are required"
		});
	}

	return await playlistsRequests.reorder({
		playlist_id: body.playlist_id,
		prev_playlist_id: body.prev_playlist_id
	});
});

