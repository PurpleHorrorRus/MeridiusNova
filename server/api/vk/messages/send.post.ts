import type { EventHandlerRequest, H3Event } from "h3";

import { BaseRequest } from "~~/server/utils/base";

export default defineEventHandler(async (event) => {
	const baseRequest = new BaseRequest(event);
	const body = await readBody(event);

	if (!body.attachment || !body.peer_id) {
		throw createError({
			statusCode: 400,
			message: "attachment and peer_id are required"
		});
	}

	const response = await baseRequest.callVKAPI("messages.send", {
		peer_id: body.peer_id,
		message: body.message || "",
		attachment: body.attachment,
		random_id: body.random_id || Math.floor(Math.random() * 10000)
	});

	return {
		success: true,
		response
	};
});

