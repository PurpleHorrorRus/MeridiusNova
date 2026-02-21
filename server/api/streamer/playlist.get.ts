import { requireAuth } from "~~/server/utils/auth-check";
import { getPlaylist } from "~~/server/utils/broadcast-state";

export default defineEventHandler((event) => {
	requireAuth(event);
	return getPlaylist();
});
