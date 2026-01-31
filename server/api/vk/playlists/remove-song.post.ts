import { getPlaylistsRequestsInstance } from "../playlists/playlists";

export default defineEventHandler(async (event) => {
	const playlistsRequests = getPlaylistsRequestsInstance(event);
	const body = await readBody(event);

	if (!body.audio_id || !body.audio_owner_id || !body.playlist_id || !body.playlist_owner_id) {
		throw createError({
			status: 400,
			message: "audio_id, audio_owner_id, playlist_id and playlist_owner_id are required"
		});
	}

	await playlistsRequests.removeSong({
		id: body.audio_id,
		owner_id: body.audio_owner_id
	}, {
		playlist_id: body.playlist_id,
		owner_id: body.playlist_owner_id
	} as any);

	return { success: true };
});

