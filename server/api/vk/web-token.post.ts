import jwt from "jsonwebtoken";

import type { TCookie } from "~~/server/types/auth";

export const cookieSignOptions: jwt.SignOptions = {
	algorithm: "RS256"
};

export default defineEventHandler(async (event) => {
	const config = useRuntimeConfig();
	const oldCookie = getCookie(event, "token") || "";

	const decoded: TCookie = oldCookie
		? jwt.verify(oldCookie, config.cookieKey, cookieSignOptions as jwt.VerifyOptions) as TCookie
		: { access_token: "", user_id: 0, iat: 0, expires: 0 };

	const webToken = await getHttpInstance().webToken(decoded.access_token);

	if (!webToken) {
		return false;
	}

	const token = jwt.sign({
		access_token: webToken.access_token,
		user_id: webToken.user_id,
		expires: webToken.expires
	}, config.cookieKey, cookieSignOptions);

	await setUserSession(event, {
		loggedIn: true,
		user: { id: webToken.user_id }
	});

	setCookie(event, "token", token, {
		httpOnly: true,
		secure: true,
		sameSite: "strict",
		expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
	});

	return webToken;
});