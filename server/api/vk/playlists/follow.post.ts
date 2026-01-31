import { getPlaylistsRequestsInstance } from "../playlists/playlists";

export default defineEventHandler(async (event) => {
	const playlistsRequests = getPlaylistsRequestsInstance(event);
	const body = await readBody(event);

	if (!body.playlist_id || !body.owner_id) {
		throw createError({
			status: 400,
			message: "playlist_id and owner_id are required"
		});
	}

	// audio.followPlaylist требует playlist_id, owner_id и access_key (из access_hash)
	// access_token передается автоматически через callVKAPI
	return await playlistsRequests.follow({
		playlist_id: body.playlist_id,
		owner_id: body.owner_id,
		access_hash: body.access_hash || ""
	});
});

