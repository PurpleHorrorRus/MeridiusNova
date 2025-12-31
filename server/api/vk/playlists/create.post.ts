import { getPlaylistsRequestsInstance } from "../playlists/playlists";

export default defineEventHandler(async (event) => {
	const playlistsRequests = getPlaylistsRequestsInstance(event);
	const body = await readBody(event);

	if (!body.title) {
		throw createError({
			statusCode: 400,
			message: "title is required"
		});
	}

	return await playlistsRequests.create({
		title: body.title,
		description: body.description || "",
		cover: body.cover
	});
});

