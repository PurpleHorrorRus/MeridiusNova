import { getPlaylistsRequestsInstance } from "./playlists";

export default defineEventHandler(async (event) => {
	const playlistsRequests = getPlaylistsRequestsInstance(event);
	const query = getQuery(event);

	try {
		return await playlistsRequests.get({
			owner_id: query.owner_id ? Number(query.owner_id) : undefined,
			offset: query.offset ? Number(query.offset) : undefined,
			access_hash: query.access_hash as string | undefined
		});
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		const errorData = error && typeof error === "object" && "data" in error ? error.data : null;
		
		throw createError({
			statusCode: error && typeof error === "object" && "statusCode" in error 
				? Number(error.statusCode) 
				: 500,
			message: `Failed to load playlists: ${errorMessage}`,
			data: errorData
		});
	}
});

