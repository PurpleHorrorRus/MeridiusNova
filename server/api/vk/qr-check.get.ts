import { type TAuthSession } from "~~/server/utils/types";
import webTokenPost from "./web-token.post";

export default defineEventHandler(async (event) => {
	const http = getHttpInstance();

	const userSession = await getUserSession(event);
	const session = userSession?.session as TAuthSession;

	if (!session || !session.qr || !session.init) {
		throw createError({
			statusCode: 400,
			statusMessage: "QR session not found"
		});
	}

	if (session.qr.expires_in < Math.floor(Date.now() / 1000)) {
		throw createError({
			statusCode: 400,
			statusMessage: "QR code expired"
		});
	}

	const qrCheckResponse = await http.request<Record<string, any>>(`${configuration.endpoints.qr.checkAuthCode}?${new URLSearchParams({
		v: configuration.auth.app.v,
		client_id: session.init.auth.host_app_id
	}).toString()}`, {
		auth_hash: session.qr.auth_hash,
		web_auth: 1,
		anonymous_token: session.init.auth.anonymous_token,
		access_token: ""
	}, configuration.auth.options);

	if (qrCheckResponse.response?.status === 2) {
		const connectCodeAuthResponse = await http.request<TCheckResponse>(configuration.endpoints.qr.connectCodeAuth, {
			token: qrCheckResponse.response.super_app_token,
			uuid: http.uuid,
			app_id: session.init.auth.host_app_id,
			flow_start_state: "",
			is_external_carousel: "",
			oauth_version: "",
			sid: "",
			oauth_force_hash: 0,
			is_registration: 0,
			oauth_response_type: "silent_token",
			vkid_oauth_hash: "",
			is_oauth_migrated_flow: 0,
			oauth_state: "",
			to: Buffer.from("https://vk.ru/").toString("base64"),
			version: 1
		}, configuration.auth.options);

		if (connectCodeAuthResponse.type === "error") {
			throw connectCodeAuthResponse;
		}

		await http.request<string>(connectCodeAuthResponse.data.next_step_url);
		return await webTokenPost(event);
	}
	
	return false;
});