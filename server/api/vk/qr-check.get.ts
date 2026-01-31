import jwt from "jsonwebtoken";

import { generateDeviceFingerprint, generateSessionId } from "~~/server/utils/device-fingerprint";
import { addSession, getSessionData, removeSession } from "~~/server/utils/session-storage";
import { configuration, getHttpInstance, migrateCookies } from "~~/server/utils/http";
import { cookieSignOptions } from "./web-token.post";

import type { TCookie } from "~~/server/types/auth";
import type { TAuthSession } from "~~/server/utils/types";

export default defineEventHandler(async (event) => {
	const http = getHttpInstance();
	const config = useRuntimeConfig();

	const userSession = await getUserSession(event);
	const session = userSession?.session as TAuthSession;

	if (!session || !session.qr || !session.init) {
		throw createError({
			status: 400,
			statusText: "QR session not found"
		});
	}

	if (session.qr.expires_in < Math.floor(Date.now() / 1000)) {
		throw createError({
			status: 400,
			statusText: "QR code expired"
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

	if (qrCheckResponse.type === "error" || (qrCheckResponse as any).error_code) {
		const errorCode = (qrCheckResponse as any).error_code || "unknown";
		const errorInfo = (qrCheckResponse as any).error_info || (qrCheckResponse as any).error_msg || "Произошла ошибка при авторизации";

		throw createError({
			status: 400,
			statusText: errorInfo,
			data: {
				error_code: errorCode,
				error_info: errorInfo,
				type: "error"
			}
		});
	}

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

		if (connectCodeAuthResponse.type === "error" || (connectCodeAuthResponse as any).error_code) {
			const errorCode = (connectCodeAuthResponse as any).error_code || "unknown";
			const errorInfo = (connectCodeAuthResponse as any).error_info || (connectCodeAuthResponse as any).error_msg || "Произошла ошибка при авторизации";

			throw createError({
				status: 400,
				statusText: errorInfo,

				data: {
					error_code: errorCode,
					error_info: errorInfo,
					type: "error"
				}
			});
		}

		await http.request<string>(connectCodeAuthResponse.data.next_step_url);

		const oldCookie = getCookie(event, "token") || "";
		let decoded: TCookie | false = false;

		if (oldCookie) {
			decoded = await Promise.resolve(jwt.verify(oldCookie, config.cookieKey, cookieSignOptions as jwt.VerifyOptions) as TCookie).catch(() => {
				return false;
			});

			if (decoded !== false) {
				const isOldToken = !decoded.sessionId || !decoded.deviceFingerprint;
				if (!isOldToken) {
					const currentDeviceFingerprint = generateDeviceFingerprint(event);
					const oldSession = decoded.sessionId ? getSessionData(decoded.sessionId) : null;

					if (oldSession && oldSession.deviceFingerprint === currentDeviceFingerprint) {
						removeSession(decoded.sessionId);
					}
				}
			}
		}

		const accessToken = connectCodeAuthResponse.data.access_token;
		const webToken = await http.webToken(accessToken).catch((error: any) => {
			const errorCode = error?.error_code || error?.code || "unknown";
			const errorInfo = error?.error_info || error?.error_msg || error?.message || "Произошла ошибка при получении токена";

			throw createError({
				status: 400,
				statusText: errorInfo,
				data: {
					error_code: errorCode,
					error_info: errorInfo,
					type: "error"
				}
			});
		});

		if (!webToken) {
			throw createError({
				status: 400,
				statusText: "Не удалось получить токен авторизации",
				data: {
					error_code: "token_error",
					error_info: "Не удалось получить токен авторизации",
					type: "error"
				}
			});
		}

		migrateCookies(webToken.user_id);

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
			expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
		});

		return webToken;
	}
	
	return false;
});