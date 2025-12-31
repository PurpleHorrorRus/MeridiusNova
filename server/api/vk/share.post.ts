import { BaseRequest } from "~~/server/utils/base";

export default defineEventHandler(async (event) => {
	const body = await readBody(event);
	const baseRequest = new BaseRequest(event);

	if (body.toWall) {
		return await baseRequest.callVKAPI("wall.post", {}, {
			attachments: body.attachment,
			message: body.message || ""
		}, "POST");
	}

	return await baseRequest.callVKAPI("messages.send", {}, {
		attachment: body.attachment,
		peer_id: body.peer_id,
		message: body.message || "",
		random_id: Math.floor(Math.random() * 10000)
	}, "POST");
});

