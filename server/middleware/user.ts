import jwt from "jsonwebtoken";

import webTokenPost, { cookieSignOptions } from "../api/vk/web-token.post";
import { isValidSession, updateSessionAccess } from "../utils/session-storage";

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
	
	const decoded = await Promise.resolve(jwt.verify(token, cookieKey, cookieSignOptions as jwt.VerifyOptions) as TCookie).catch(() => {
		return;
	});

	if (!decoded) {
		return;
	}
	
	const isOldToken = !decoded.sessionId || !decoded.deviceFingerprint;
	const isExpired = decoded.expires < Date.now() / 1000;

	if (isOldToken) {
		return;
	}

	if (!isValidSession(decoded.sessionId, decoded.user_id)) {
		return;
	}

	updateSessionAccess(decoded.sessionId);

	if (isExpired) {
		const webToken = await webTokenPost(event);
		if (webToken && typeof webToken === "object" && "user_id" in webToken) {
			event.context.user = { id: (webToken as TWebTokenResponse["data"]).user_id };
		}
	} else {
		event.context.user = { id: decoded.user_id };
	}
});