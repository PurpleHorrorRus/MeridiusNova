import webTokenPost from "./web-token.post";

export default defineEventHandler(async (event) => {
	await getHttpInstance().request<string>(configuration.endpoints.main, {}, {
		method: ERequestMethod.GET
	});

	return { loggedIn: !!await webTokenPost(event) }
});