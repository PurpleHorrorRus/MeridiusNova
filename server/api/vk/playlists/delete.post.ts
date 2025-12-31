import { getPlaylistsRequestsInstance } from "../playlists/playlists";

export default defineEventHandler(async (event) => {
	const playlistsRequests = getPlaylistsRequestsInstance(event);
	const body = await readBody(event);

	if (!body.playlist_id || !body.owner_id) {
		throw createError({
			statusCode: 400,
			message: "playlist_id and owner_id are required"
		});
	}

	return await playlistsRequests.delete({
		playlist_id: body.playlist_id,
		owner_id: body.owner_id,
		edit_hash: body.edit_hash || ""
	} as any);
});

