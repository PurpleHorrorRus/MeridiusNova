import jwt from "jsonwebtoken";

import type { TCookie } from "~~/server/types/auth";
import { generateDeviceFingerprint, generateSessionId } from "~~/server/utils/device-fingerprint";

export const cookieSignOptions: jwt.SignOptions = {
	algorithm: "RS256"
};

export default defineEventHandler(async (event) => {
	const config = useRuntimeConfig();
	const oldCookie = getCookie(event, "token") || "";

	let decoded: TCookie = { access_token: "", user_id: 0, iat: 0, expires: 0, sessionId: "", deviceFingerprint: "" };

	if (oldCookie) {
		try {
			decoded = jwt.verify(oldCookie, config.cookieKey, cookieSignOptions as jwt.VerifyOptions) as TCookie;
			
			const isOldToken = !decoded.sessionId || !decoded.deviceFingerprint;
			if (isOldToken) {
				return false;
			}
		} catch (error) {
			return false;
		}
	}

	if (!decoded.access_token) {
		return false;
	}

	const webToken = await getHttpInstance().webToken(decoded.access_token);

	if (!webToken) {
		return false;
	}

	const deviceFingerprint = generateDeviceFingerprint(event);
	const sessionId = generateSessionId();

	const token = jwt.sign({
		access_token: webToken.access_token,
		user_id: webToken.user_id,
		expires: webToken.expires,
		sessionId: sessionId,
		deviceFingerprint: deviceFingerprint
	}, config.cookieKey, cookieSignOptions);

	await setUserSession(event, {
		loggedIn: true,
		user: { id: webToken.user_id }
	});

	setCookie(event, "token", token, {
		httpOnly: true,
		secure: false,
		sameSite: "strict",
		expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
	});

	return webToken;
});