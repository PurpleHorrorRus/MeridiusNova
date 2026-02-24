import { getArtistsRequestsInstance } from "./artists";

export default defineEventHandler(async (event) => {
	const artistsRequests = getArtistsRequestsInstance(event);
	return await artistsRequests.getSubscriptions();
});
