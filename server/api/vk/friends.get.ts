import { BaseRequest } from "~~/server/utils/base";

export default defineEventHandler(async (event) => {
	const baseRequest = new BaseRequest(event);

	const response = await baseRequest.callVKAPI("friends.get", {
		fields: "photo_100"
	});

	return response.items || [];
});

