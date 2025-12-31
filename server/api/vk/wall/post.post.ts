import { BaseRequest } from "~~/server/utils/base";
import type { EventHandlerRequest, H3Event } from "h3";

export default defineEventHandler(async (event) => {
	const baseRequest = new BaseRequest(event);
	const body = await readBody(event);

	if (!body.attachments) {
		throw createError({
			statusCode: 400,
			message: "attachments are required"
		});
	}

	const response = await baseRequest.callVKAPI("wall.post", {
		message: body.message || "",
		attachments: body.attachments
	});

	return {
		success: true,
		response
	};
});

