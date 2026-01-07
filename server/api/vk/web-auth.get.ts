import { ERequestMethod, type TAuthSession } from "~~/server/utils/types";
import { configuration, regex$1, getHttpInstance } from "~~/server/utils/http";

export default defineEventHandler(async (event) => {
	const userId = event.context.user?.id;

	if (!userId) {
		throw createError({
			statusCode: 401,
			statusMessage: "User ID is required"
		});
	}

	const http = getHttpInstance(userId);

	const qrPageResponse = await http.request<string>(`${configuration.endpoints.authPage}?${new URLSearchParams({
		...configuration.auth.pageParams,
		uuid: http.uuid,
		app_id: configuration.auth.app.id
	}).toString()}`, {}, {
		method: ERequestMethod.GET,

		additionalHeaders: {
			"priority": "u=0, i",
			...configuration.auth.options.additionalHeaders
		}
	});

	const init = JSON.parse(qrPageResponse.match(regex$1.LOGIN_INIT)![1]);

	await setUserSession(event, {
		session: {
			init: {
				auth: {
					v: init.auth.v,
					host_app_id: init.auth.host_app_id,
					anonymous_token: init.auth.anonymous_token
				}
			}
		} as TAuthSession
	});

	const authUrl = new URL(configuration.endpoints.authPage);
	authUrl.searchParams.set("app_id", configuration.auth.app.id.toString());
	authUrl.searchParams.set("uuid", http.uuid);
	authUrl.searchParams.set("response_type", "silent_token");
	authUrl.searchParams.set("redirect_uri", "https://vk.ru/");
	authUrl.searchParams.set("v", "1.3.0");
	authUrl.searchParams.set("scheme", "dark");
	authUrl.searchParams.set("is_redesigned", "1");

	return {
		url: authUrl.toString()
	};
});

