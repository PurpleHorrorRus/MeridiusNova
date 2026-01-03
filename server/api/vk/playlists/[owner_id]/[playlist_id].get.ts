import { getPlaylistsRequestsInstance } from "../playlists";
import { requireAuth } from "~~/server/utils/auth-check";

export default defineEventHandler(async (event) => {
	requireAuth(event);

	const playlistsRequests = getPlaylistsRequestsInstance(event);
	const owner_id = Number(getRouterParam(event, "owner_id"));
	const playlist_id = Number(getRouterParam(event, "playlist_id"));
	const query = getQuery(event);

	return await playlistsRequests.getPlaylist({
		owner_id,
		playlist_id,
		access_hash: query.access_hash as string | undefined,
		list: !("list" in query) || query.list === "true",
		count: query.count ? Number(query.count) : undefined,
		offset: query.offset ? Number(query.offset) : undefined
	});
});

