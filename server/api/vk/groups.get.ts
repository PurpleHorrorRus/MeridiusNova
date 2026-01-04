import { BaseRequest } from "~~/server/utils/base";

export default defineEventHandler(async (event) => {
	const baseRequest = new BaseRequest(event);

	const response = await baseRequest.callVKAPI("groups.get", {
		extended: "1",
		fields: "photo_100,name"
	});

	return response.items || [];
});







