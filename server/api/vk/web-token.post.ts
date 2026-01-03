import jwt from "jsonwebtoken";

import type { TCookie } from "~~/server/types/auth";
import { generateDeviceFingerprint, generateSessionId } from "~~/server/utils/device-fingerprint";
import { addSession, getSessionData, removeSession } from "~~/server/utils/session-storage";

export const cookieSignOptions: jwt.SignOptions = {
	algorithm: "RS256"
};

export default defineEventHandler(async (event) => {
	const config = useRuntimeConfig();
	const oldCookie = getCookie(event, "token") || "";

	let decoded: TCookie | false = false;

	if (oldCookie) {
		decoded = await Promise.resolve(jwt.verify(oldCookie, config.cookieKey, cookieSignOptions as jwt.VerifyOptions) as TCookie).catch(() => {
			return false;
		});

		if (decoded === false) {
			return false;
		}
		
		const isOldToken = !decoded.sessionId || !decoded.deviceFingerprint;
		if (isOldToken) {
			return false;
		}

		const currentDeviceFingerprint = generateDeviceFingerprint(event);
		const oldSession = decoded.sessionId ? getSessionData(decoded.sessionId) : null;

		if (oldSession && oldSession.deviceFingerprint === currentDeviceFingerprint) {
			removeSession(decoded.sessionId);
		}
	}

	if (!decoded || !decoded.access_token) {
		return false;
	}

	const webToken = await getHttpInstance().webToken(decoded.access_token);

	if (!webToken) {
		return false;
	}

	const sessionId = generateSessionId();
	const deviceFingerprint = generateDeviceFingerprint(event);

	addSession(webToken.user_id, sessionId, deviceFingerprint);

	const token = jwt.sign({
		access_token: webToken.access_token,
		user_id: webToken.user_id,
		expires: webToken.expires,
		sessionId,
		deviceFingerprint
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