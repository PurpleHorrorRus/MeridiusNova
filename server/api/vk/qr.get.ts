import { ERequestMethod, type TAuthSession } from "~~/server/utils/types";

export default defineEventHandler(async (event) => {
	const http = getHttpInstance();

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

	const getAuthCodeResponse = await http.request<Record<string, any>>(`${configuration.endpoints.qr.getAuthCode}?${new URLSearchParams({
		v: configuration.auth.app.v,
		client_id: init.auth.host_app_id
	}).toString()}`, {
		device_name: "Windows NT 10.0; Win64; x64",
		auth_code_flow: 0,
		verification_hash: "",
		force_regenerate: 0,
		anonymous_token: init.auth.anonymous_token,
		is_switcher_flow: "",
		access_token: ""
	}, configuration.auth.options);

	await setUserSession(event, {
		session: {
			qr: {
				auth_hash: getAuthCodeResponse.response.auth_hash,
				expires_in: getAuthCodeResponse.response.expires_in
			},

			init: {
				auth: {
					v: init.auth.v,
					host_app_id: init.auth.host_app_id,
					anonymous_token: init.auth.anonymous_token
				}
			}
		} as TAuthSession
	});

	return {
		url: getAuthCodeResponse.response.auth_url,
		expires_in: getAuthCodeResponse.response.expires_in
	};
});