import { requireAuth } from "~~/server/utils/auth-check";
import { getNowPlaying } from "~~/server/utils/broadcast-state";

export default defineEventHandler((event) => {
	requireAuth(event);
	return getNowPlaying();
});
