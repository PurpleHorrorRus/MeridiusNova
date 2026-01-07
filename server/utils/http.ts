import path from "node:path";
import os from "node:os";
import fs from "fs-extra";
import { CookieJar } from "tough-cookie";
import FileCookieStore from "tough-cookie-file-store";

import { ERequestMethod } from "./types";

import type { UserSession } from "#auth-utils";
import type { H3Event, EventHandlerRequest } from "h3";

import type { TFetchCorsRequestInit } from "./types";
import type { TWebTokenError, TWebTokenResponse } from "../types/auth";

export type TRequestOptions = {
	method?: ERequestMethod;
	headers?: Record<string, string>;
	additionalHeaders?: Record<string, string>;
	parse?: boolean;
};

export const configuration: Record<string, any> = {
	auth: {
		app: {
			id: 7913379,
			v: "5.258"
		},

		pageParams: {
			action: Buffer.from(JSON.stringify({
				name: "qr_auth",
				token: "qr_auth_scanned",

				entry: {
					source: "main",
					screen: "start"
				}
			})).toString("base64"),

			scheme: "dark",
			is_redesigned: 1,
			response_type: "silent_token",
			v: "1.3.0",
			redirect_uri: "https://vk.ru/",
		},

		options: {
			method: "POST",
			parse: true,

			additionalHeaders: {
				Priority: "u=1, i",
				Origin: "https://id.vk.ru",
				Referer: "https://id.vk.ru/"
			}
		} as TRequestOptions
	},

	webToken: {
		version: 1,
		app_id: 6287487
	},

	headers: {
		"Accept": "*/*",
		"Content-Type": "application/x-www-form-urlencoded",
		"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:143.0) Gecko/20100101 Firefox/143.0",
		"X-Requested-With": "XMLHttpRequest"
	},

	endpoints: {
		main: "https://vk.ru/",
		authPage: "https://id.vk.ru/auth",
		webToken: "https://login.vk.ru/?act=web_token",

		qr: {
			getAuthCode: "https://api.vk.ru/method/auth.getAuthCode",
			checkAuthCode: "https://api.vk.ru/method/auth.checkAuthCode",
			connectCodeAuth: "https://login.vk.ru/?act=connect_code_auth"
		}
	},

	baseUrl: "https://vk.ru",
	redirectCodes: [301, 302, 303]
};

export const regex$1 = {
	LOGIN_INIT: /window\.init = (.*?);/,
	ACTION_LOGIN: /Index\.initRedesignedVkId/
};

export class Http {
	public session: UserSession | null = null;

	protected cookieJar: CookieJar;

	public deviceId: string = "";
	public uuid: string = "";
	protected auth_hash: string = "";
	protected expires_in: number = 0;

	constructor(protected readonly cookiePath: string = "cookies.json") {
		const cookieStore = new FileCookieStore(this.cookiePath);
		this.cookieJar = new CookieJar(cookieStore);

		this.deviceId = this.getDeviceId();
		this.uuid = this.getUuid();
	}

	public async request<T extends string | Record<string, any> | any[]>(url: string, form: Record<string, string | number | boolean | Record<string, any>> = {}, options: TRequestOptions = { method: ERequestMethod.POST }): Promise<T> {
		if (/^https:\/\/vk\.ru\/https?:\/\//.test(url)) {
			url = url.replace(/^https:\/\/vk\.ru\//, "");
		} else if (!/^https?:\/\//.test(url)) {
			url = `https://vk.ru${url.startsWith("/") ? "" : "/"}${url}`;
		}

		const hostname = new URL(url).href;

		const requestOptions: TFetchCorsRequestInit = {
			method: options.method || ERequestMethod.POST,
			redirect: "manual",

			headers: options.headers || {
				...configuration.headers,
				...(options.additionalHeaders || {}),
				Cookie: await this.cookieJar.getCookieString(hostname)
			},

			...options
		};

		if (requestOptions.method === ERequestMethod.POST) {
			requestOptions.body = new URLSearchParams(form as Record<string, string>).toString();
		}

		const request = await fetch(url, requestOptions);
		console.log(url, requestOptions.body, (requestOptions.headers as any).Cookie, request.status);

		if (request.headers.has("set-cookie")) {
			for (const cookie of request.headers.getSetCookie()) {
				this.cookieJar.setCookieSync(cookie, hostname);
			}
		}

		if (request.status === 307) {
			await this.request(request.headers.get("location")!, {}, {
				method: ERequestMethod.GET
			});
		} else if (configuration.redirectCodes.includes(request.status)) {
			return await this.request(request.headers.get("location")!, {}, {
				method: ERequestMethod.GET
			});
		}

		const contentType = (request.headers.get("content-type") || "") as string;

		if (contentType?.toLowerCase().startsWith("application/json") && contentType?.toLowerCase().includes("windows-1251")) {
			const win1251Buffer = await request.arrayBuffer();
			const decoder = new TextDecoder("windows-1251");
			const decodedText = decoder.decode(win1251Buffer);

			// Заменяем HTML-сущности на символы, но экранируем специальные символы JSON
			const decodedFixed = decodedText.replace(/&#(\d+);/g, (_, code) => {
				const charCode = Number(code);
				const char = String.fromCharCode(charCode);

				// Экранируем специальные символы JSON, которые должны быть экранированы в строках
				// Но делаем это только если символ не является частью уже экранированной последовательности
				if (charCode < 32) {
					// Управляющие символы - экранируем
					switch (charCode) {
						case 8: return "\\b";
						case 9: return "\\t";
						case 10: return "\\n";
						case 12: return "\\f";
						case 13: return "\\r";
						default: return `\\u${charCode.toString(16).padStart(4, "0")}`;
					}
				}
				if (char === '"' || char === '\\') {
					return `\\${char}`;
				}
				return char;
			});

			// Пытаемся распарсить JSON с обработкой ошибок
			let parsed: T | null = null;
			parsed = await Promise.resolve(JSON.parse(decodedFixed) as T).catch(async (error: Error) => {
				// Если парсинг не удался, пытаемся исправить проблемные символы
				const errorMessage = error.message;
				const positionMatch = errorMessage.match(/position (\d+)/);

				if (positionMatch) {
					const errorPosition = Number(positionMatch[1]);
					// Находим проблемный символ и пытаемся его экранировать
					const beforeError = decodedFixed.substring(0, errorPosition);
					const atError = decodedFixed[errorPosition];
					const afterError = decodedFixed.substring(errorPosition + 1);

					// Если это неэкранированный управляющий символ, экранируем его
					let fixed = decodedFixed;
					if (atError && atError.charCodeAt(0) < 32 && atError !== '\n' && atError !== '\r' && atError !== '\t') {
						// Заменяем проблемный символ на экранированную версию
						fixed = beforeError + `\\u${atError.charCodeAt(0).toString(16).padStart(4, "0")}` + afterError;
					} else if (atError === '"' && !beforeError.endsWith('\\')) {
						// Неэкранированная кавычка внутри строки
						fixed = beforeError + '\\"' + afterError;
					}

					return await Promise.resolve(JSON.parse(fixed) as T).catch((parseError: Error) => {
						// Если и это не помогло, логируем ошибку
						console.warn("Failed to parse JSON:", parseError.message);
						console.warn("JSON snippet (first 500 chars):", decodedFixed.substring(0, 500));
						return null;
					});
				}

				// Если не удалось найти позицию, возвращаем null
				return null;
			});

			return (parsed ?? decodedFixed) as T;
		}

		const text = await request.text();

		if (options.method === ERequestMethod.GET || !options.parse) {
			return text.replace(/&#(\d+);/g, (_, code) => {
				return String.fromCharCode(Number(code));
			}) as T;
		}

		return await this.parseResponse<T>(text);
	}

	public async login(): Promise<TWebTokenResponse["data"] | false> {
		const mainPageResponse = await this.request<string>(configuration.endpoints.main, {}, {
			method: ERequestMethod.GET
		});

		if (!regex$1.ACTION_LOGIN.test(mainPageResponse)) {
			return await this.webToken()
				.catch(() => false);
		}

		return false;
	}

	public async webToken(access_token: string = ""): Promise<TWebTokenResponse["data"]> {
		const response = await this.request<TWebTokenResponse | TWebTokenError>(configuration.endpoints.webToken, {
			version: configuration.webToken.version,
			app_id: configuration.webToken.app_id,
			access_token
		}, configuration.auth.options);

		console.log(response);

		if ((response as TWebTokenError).type === "error" || (response as TWebTokenError).error_code) {
			throw response;
		}

		return (response as TWebTokenResponse).data;
	}

	protected async parseResponse<T extends string | Record<string, any> | any[]>(text: string): Promise<T> {
		const parseJson = async (str: string): Promise<T | null> => {
			return await Promise.resolve(JSON.parse(str) as T).catch(() => null);
		};

		const parsed = await parseJson(text);
		if (parsed !== null) {
			return parsed;
		}

		const decoded = await Promise.resolve(atob(text)).catch(() => null);

		if (decoded) {
			const decodedParsed = await parseJson(decoded);
			if (decodedParsed !== null) {
				return decodedParsed;
			}
		}

		return text as unknown as T;
	}

	protected getDeviceId(length = 21) {
		const charset = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_";
		return Array.from({ length }, () => charset.charAt(Math.floor(Math.random() * charset.length))).join("");
	}

	protected getUuid() {
		return Array.from({ length: 6 }, () => "abcdefghijklmnopqrstuvwxyz".charAt(Math.floor(Math.random() * 26))).join("");
	}
}

const solveCookiesPath = (userId: number): string => {
	return userId !== -1
		? path.resolve(os.homedir(), ".meridius", `cookies-${userId}.json`)
		: path.resolve(os.homedir(), ".meridius", "cookies.json");
};

export const migrateCookies = (userId: number = -1): string => {
	const defaultCookiePath = solveCookiesPath(-1);
	const targetCookiePath = solveCookiesPath(userId);

	if (userId !== -1 && fs.existsSync(defaultCookiePath)) {
		fs.copyFileSync(defaultCookiePath, targetCookiePath);
		fs.removeSync(defaultCookiePath);
	}

	return userId !== -1
		? targetCookiePath
		: defaultCookiePath;
}

export const getHttpInstance = (userId: number = -1): Http => {
	const cookiesPath = solveCookiesPath(userId);
	return new Http(cookiesPath);
};