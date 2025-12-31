import { getAudioRequestsInstance } from "../audio/audio";

import type { TLyrics } from "~~/server/utils/types";

export default defineEventHandler(async (event) => {
	const audioRequests = getAudioRequestsInstance(event);
	const query = getQuery(event);

	if (!query.full_id) {
		throw createError({
			statusCode: 400,
			message: "full_id is required"
		});
	}

	const response = await audioRequests.request({
		act: "get_lyrics",
		aid: query.full_id as string,
		al: 1
	});

	const lyricsObject = response.payload[1][0] as any;

	if (!lyricsObject || (Array.isArray(lyricsObject) && lyricsObject.length === 0)) {
		return null;
	}

	const lyrics: TLyrics = {};

	if (lyricsObject.credits) {
		lyrics.credits = audioRequests.unescape(lyricsObject.credits);
	}

	if (lyricsObject.lyrics) {
		if (lyricsObject.lyrics.timestamps) {
			lyrics.lyrics = {
				timestamps: lyricsObject.lyrics.timestamps.map((timestamp: any) => ({
					...timestamp,
					line: audioRequests.unescape(timestamp.line)
				}))
			};
		} else if (lyricsObject.lyrics.text) {
			lyrics.lyrics = {
				text: lyricsObject.lyrics.text.map((line: string) => audioRequests.unescape(line))
			};
		} else if (lyricsObject.lyrics.ugc && Array.isArray(lyricsObject.lyrics.ugc)) {
			lyrics.lyrics = {
				text: lyricsObject.lyrics.ugc.map((line: string) => audioRequests.unescape(line))
			};
		}
	}

	return lyrics;
});

