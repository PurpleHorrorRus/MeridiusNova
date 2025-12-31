import { BaseRequest } from "~~/server/utils/base";
import { getAudioRequestsInstance } from "../audio/audio";
import type { EventHandlerRequest, H3Event } from "h3";
import type { TAudio } from "~~/server/api/vk/audio/types";

class SimilarSearchRequests extends BaseRequest {
	constructor(event: H3Event<EventHandlerRequest>) {
		super(event);
	}

	public async getSimilar(audio_id: number, audio_owner_id: number) {
		const audioRequests = getAudioRequestsInstance(this.event);
		
		const { list } = await this.getDataByBlock(audioRequests, {
			owner_id: this.event.context.user.id,
			section: "recoms_audio",
			block: audio_id
		});

		return {
			audios: list as TAudio[]
		};
	}
}

export default defineEventHandler(async (event) => {
	const similarSearch = new SimilarSearchRequests(event);
	const query = getQuery(event);

	if (!query.audio_id || !query.audio_owner_id) {
		throw createError({
			statusCode: 400,
			message: "audio_id and audio_owner_id are required"
		});
	}

	return await similarSearch.getSimilar(
		Number(query.audio_id),
		Number(query.audio_owner_id)
	);
});

