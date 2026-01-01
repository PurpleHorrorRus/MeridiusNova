import jwt from "jsonwebtoken";

import webTokenPost, { cookieSignOptions } from "../api/vk/web-token.post";

import type { TCookie, TWebTokenResponse } from "~~/server/types/auth";

export default defineEventHandler(async event => {
	const token = getCookie(event, "token");

	if (!token) {
		return;
	}
	
	const { cookieKey } = useRuntimeConfig();
	
	if (!cookieKey || cookieKey === "") {
		console.error("ERROR: cookieKey is empty or undefined!");
		return;
	}
	
	const decoded = await jwt.verify(token, cookieKey, cookieSignOptions as jwt.VerifyOptions) as TCookie;
	
	if (decoded.expires < Date.now() / 1000) {
		const webToken = await webTokenPost(event);
		if (webToken && typeof webToken === "object" && "user_id" in webToken) {
			event.context.user = { id: (webToken as TWebTokenResponse["data"]).user_id };
		}
	} else {
		event.context.user = { id: decoded.user_id };
	}
});