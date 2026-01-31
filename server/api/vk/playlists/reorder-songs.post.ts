import { getPlaylistsRequestsInstance } from "../playlists/playlists";

export default defineEventHandler(async (event) => {
	const playlistsRequests = getPlaylistsRequestsInstance(event);
	const body = await readBody(event);

	if (!body.playlist_id) {
		throw createError({
			status: 400,
			message: "playlist_id is required"
		});
	}

	return await playlistsRequests.reorderSongs({
		playlist_id: body.playlist_id,
		Audios: body.Audios,
		force: body.force
	});
});

