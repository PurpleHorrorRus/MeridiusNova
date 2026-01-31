import { getPlaylistsRequestsInstance } from "./playlists";

export default defineEventHandler(async (event) => {
	const playlistsRequests = getPlaylistsRequestsInstance(event);
	const query = getQuery(event);

	const result = await playlistsRequests.get({
		owner_id: query.owner_id ? Number(query.owner_id) : undefined,
		offset: query.offset ? Number(query.offset) : undefined,
		access_hash: query.access_hash as string | undefined
	}).catch((error: Error) => {
		const errorData = error && typeof error === "object" && "data" in error ? error.data : null;
		
		throw createError({
			status: error && typeof error === "object" && ("statusCode" in error || "status" in error)
				? Number("status" in error ? (error as { status: number }).status : (error as { statusCode: number }).statusCode)
				: 500,
			message: `Failed to load playlists: ${error.message || String(error)}`,
			data: errorData
		});
	});

	return result;
});

