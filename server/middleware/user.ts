import jwt from "jsonwebtoken";

import webTokenPost, { cookieSignOptions } from "../api/vk/web-token.post";
import { verifyDeviceFingerprint } from "../utils/device-fingerprint";

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
	
	let decoded: TCookie;
	
	try {
		decoded = await jwt.verify(token, cookieKey, cookieSignOptions as jwt.VerifyOptions) as TCookie;
	} catch (error) {
		return;
	}
	
	const isOldToken = !decoded.sessionId || !decoded.deviceFingerprint;
	const isExpired = decoded.expires < Date.now() / 1000;
	const fingerprintMismatch = decoded.deviceFingerprint && !verifyDeviceFingerprint(event, decoded.deviceFingerprint);

	if (isOldToken || fingerprintMismatch) {
		return;
	}

	if (isExpired) {
		const webToken = await webTokenPost(event);
		if (webToken && typeof webToken === "object" && "user_id" in webToken) {
			event.context.user = { id: (webToken as TWebTokenResponse["data"]).user_id };
		}
	} else {
		event.context.user = { id: decoded.user_id };
	}
});