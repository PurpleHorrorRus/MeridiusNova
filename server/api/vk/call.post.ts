import { BaseRequest } from "~~/server/utils/base";

export default defineEventHandler(async (event) => {
	const baseRequest = new BaseRequest(event);
	const body = await readBody(event);

	if (!body.method) {
		throw createError({
			statusCode: 400,
			message: "method is required"
		});
	}

	const method = body.method as string;
	const params = body.params || {};
	const form = body.form || {};

	const response = await baseRequest.callVKAPI(method, params, form, body.methodType || "POST");

	return {
		success: true,
		response
	};
});


