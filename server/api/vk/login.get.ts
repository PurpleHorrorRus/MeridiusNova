import { ERequestMethod } from "~~/server/utils/types";
import { configuration, getHttpInstance } from "~~/server/utils/http";
import webTokenPost from "./web-token.post";

export default defineEventHandler(async (event) => {
	await getHttpInstance(event.context.user?.id ?? -1).request<string>(configuration.endpoints.main, {}, {
		method: ERequestMethod.GET
	});


	return { loggedIn: !!await webTokenPost(event) }
});