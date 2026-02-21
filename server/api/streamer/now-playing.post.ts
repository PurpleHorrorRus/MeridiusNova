import type { TAudio } from "~~/server/api/vk/audio/types";
import { setNowPlaying, setPaused, setPlaylist, setTime } from "~~/server/utils/broadcast-state";

export default defineEventHandler(async (event) => {
	const body = await readBody<{
		song?: TAudio | null;
		playlist?: TAudio[];
		currentTime?: number;
		duration?: number;
		paused?: boolean;
	}>(event);

	if (!body) {
		throw createError({
			status: 400,
			message: "Body is required"
		});
	}

	if (body.song !== undefined) {
		setNowPlaying(body.song ?? null);
	}

	if (body.playlist !== undefined) {
		setPlaylist(Array.isArray(body.playlist) ? body.playlist : []);
	}

	if (body.currentTime !== undefined && body.duration !== undefined) {
		setTime(Number(body.currentTime), Number(body.duration));
	}

	if (body.paused !== undefined) {
		setPaused(Boolean(body.paused));
	}

	return { success: true };
});
