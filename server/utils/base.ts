import jwt from "jsonwebtoken";
import { getCookie } from "h3";
import { useRuntimeConfig } from "#imports";

import type { EventHandlerRequest, H3Event } from "h3";
import type { UserSession } from "#auth-utils";
import type { HTMLElement } from "node-html-parser";

import type { Http, TRequestOptions } from "./http";
import type { IRequest, TGetCatalogSectionPayload, TGetSectionPayload, TMore, TRawResponse } from "./types";
import type { TAudio, TRawAudio } from "~~/server/api/vk/audio/types";

// Используем динамический импорт с кэшированием для jsdom
let jsdomCache: typeof import("jsdom").JSDOM | null = null;
let jsdomPromise: Promise<typeof import("jsdom").JSDOM> | null = null;

async function loadJSDOM() {
	if (!jsdomPromise) {
		jsdomPromise = import("jsdom").then(module => {
			jsdomCache = module.JSDOM;
			return module.JSDOM;
		});
	}
	return jsdomPromise;
}

// Предзагружаем jsdom
if (typeof window === "undefined") {
	loadJSDOM();
}

function getJSDOM() {
	return jsdomCache;
}

export type TGetSectionParams = {
	owner_id: number;
	section: string;
};

type TRequestMoreParams = Partial<{
	page: boolean;
	count: number;
}>;

export class BaseRequest implements IRequest {
	public session: UserSession | null = null;
	public http: Http;

	constructor(protected readonly event: H3Event<EventHandlerRequest>) {
		const userId = event.context.user?.id;
		this.http = getHttpInstance(userId);
	}

	public async request<T extends string | Record<string, any> | any[]>(
		form: Record<string, any> = {},
		file: string = "al_audio.php",
		options: TRequestOptions = { method: ERequestMethod.POST }
	): Promise<T> {
		return await this.http.request<T>(`https://vk.ru/${file}`, form, options);
	}

	public async callVKAPI(endpoint: string, params: Record<string, any> = {}, form: Record<string, any> = {}, method: "GET" | "POST" = "GET", retryCount: number = 0): Promise<any> {
		const maxRetries = 3;
		const retryDelay = 2000;

		const token = getCookie(this.event, "token");

		if (!token) {
			throw new Error("No access token available");
		}

		const { cookieKey } = useRuntimeConfig();
		const { cookieSignOptions } = await import("~~/server/api/vk/web-token.post");
		const { isValidSession, updateSessionAccess } = await import("./session-storage");

		const decodedToken = await Promise.resolve(jwt.verify(token, cookieKey, cookieSignOptions as object) as Record<string, any>).catch(() => {
			throw new Error("Invalid token");
		});

		if (
			!decodedToken ||
			typeof decodedToken !== "object" ||
			!("access_token" in decodedToken) ||
			!("user_id" in decodedToken)
		) {
			throw new Error("Malformed token payload");
		}

		const decoded = decodedToken as { access_token: string; user_id: number; sessionId?: string; deviceFingerprint?: string };

		const isOldToken = !decoded.sessionId || !decoded.deviceFingerprint;
		
		if (isOldToken) {
			throw new Error("Old token format - re-authentication required");
		}

		if (!isValidSession(decoded.sessionId, decoded.user_id)) {
			throw new Error("Invalid session - unauthorized access attempt");
		}

		updateSessionAccess(decoded.sessionId);

		const query = new URLSearchParams({
			...params,
			v: "5.269",
			access_token: decoded.access_token
		}).toString();

		const response = await fetch(`https://api.vk.ru/method/${endpoint}?${query}`, {
			method,
			body: method === "POST" ? new URLSearchParams(form).toString() : undefined,

			headers: {
				"User-Agent": "VKAndroidApp/9.2.0-24200 (Android 11; SDK 30; arm64-v8a; Xiaomi M2003J15SC; ru; 2340x1080)",
				...(method === "POST" ? { "Content-Type": "application/x-www-form-urlencoded" } : {})
			} as HeadersInit
		}).catch(async (error: Error) => {
			const errorMsg = error.message || "";
			const isFloodControl = errorMsg.toLowerCase().includes("flood control");
			const isTooManyRequests = errorMsg.toLowerCase().includes("too many requests");

			if ((isFloodControl || isTooManyRequests) && retryCount < maxRetries) {
				const delay = retryDelay * (retryCount + 1);
				await new Promise(resolve => setTimeout(resolve, delay));
				return await this.callVKAPI(endpoint, params, form, method, retryCount + 1);
			}

			throw error;
		});

		const json = await response.json().catch(async (error: Error) => {
			const errorMsg = error.message || "";
			const isFloodControl = errorMsg.toLowerCase().includes("flood control");
			const isTooManyRequests = errorMsg.toLowerCase().includes("too many requests");

			if ((isFloodControl || isTooManyRequests) && retryCount < maxRetries) {
				const delay = retryDelay * (retryCount + 1);
				await new Promise(resolve => setTimeout(resolve, delay));
				return await this.callVKAPI(endpoint, params, form, method, retryCount + 1);
			}

			throw error;
		});

		if (json.error) {
			const errorMsg = json.error.error_msg || "";
			const errorCode = json.error.error_code;
			const isFloodControl = errorMsg.toLowerCase().includes("flood control") || errorCode === 9;
			const isTooManyRequests = errorMsg.toLowerCase().includes("too many requests") || errorCode === 6;

			if ((isFloodControl || isTooManyRequests) && retryCount < maxRetries) {
				const delay = retryDelay * (retryCount + 1);
				await new Promise(resolve => setTimeout(resolve, delay));
				return await this.callVKAPI(endpoint, params, form, method, retryCount + 1);
			}

			throw new Error(`VK API Error: ${errorMsg || JSON.stringify(json.error)}`);
		}

		return json.response;
	}

	public async loadCatalogSection<T>(more: TMore): Promise<TRawResponse<T>> {
		return this.request<any>({
			act: "load_catalog_section",
			al: 1,
			section_id: more.section_id,
			...(more.next_from ? { start_from: more.next_from } : {})
		});
	}

	public async getSection<T>(params: TGetSectionParams): Promise<TRawResponse<T>> {
		return await this.request<TRawResponse<T>>({
			...params,

			act: "section",
			al: 1,
			claim: 0,
			is_layer: 0
		});
	}

	public async requestMore<T extends TGetCatalogSectionPayload, K>(more: TMore, params: TRequestMoreParams = {}): Promise<{ list: K[]; more: TMore } | K> {
		const response = await this.loadCatalogSection<T>(more);

		if (params.page) {
			return response as K;
		}

		let list = await this.builder<T, K>(response);

		if (params.count) {
			list = list.slice(0, params.count);
		}

		return {
			list,

			more: typeof response === "string"
				? this.parseMore(response)
				: this.parseMore((response as TRawResponse<T>).payload[1][1])
		};
	}

	public parseMore(response: string | Record<string, any>, params: { forcePlaylist?: boolean } = {}): TMore {
		if (typeof response === "string") {
			const nextFromMatch = response.match(/next_from":"(.*?)"/);
			const sectionIdMatch = response.match(/sectionId":"(.*?)"/);

			if (!nextFromMatch || !sectionIdMatch) {
				return {
					section_id: "",
					next_from: "",
					start_from: ""
				};
			}

			const next_from = nextFromMatch[1];

			return {
				section_id: sectionIdMatch[1],
				next_from,
				start_from: next_from
			};
		}

		if (typeof response === "object" && response !== null) {
			// Аналогично meridius-core/lib/static.js строки 366-375
			params.forcePlaylist = response.playlist && params.forcePlaylist;

			const section_id = params.forcePlaylist
				? (response.playlist?.id || response.playlist?.blockId)
				: (response.section_id
					|| response.sectionId
					|| (response.payload && typeof response.payload === "object" && response.payload[1] && typeof response.payload[1] === "object" && response.payload[1][1] && typeof response.payload[1][1] === "object"
						? (response.payload[1][1].section_id || response.payload[1][1].sectionId)
						: undefined));

			const next_from = params.forcePlaylist
				? response.playlist?.nextOffset
				: (response.next_from
					|| response.nextFrom
					|| response.nextOffset
					|| (response.payload && typeof response.payload === "object" && response.payload[1] && typeof response.payload[1] === "object" && response.payload[1][1] && typeof response.payload[1][1] === "object"
						? (response.payload[1][1].next_from || response.payload[1][1].nextFrom || response.payload[1][1].nextOffset)
						: undefined));

			if (!next_from) {
				return {
					section_id: "",
					next_from: "",
					start_from: ""
				};
			}

			return {
				section_id: section_id || "",
				next_from,
				start_from: next_from
			};
		}

		return {
			section_id: "",
			next_from: "",
			start_from: ""
		};
	}

	public async builder<T, K>(response: TRawResponse<T>): Promise<K[]> {
		throw new Error("Not implemented");
	}

	public unescape(text: string): string {
		const JSDOM = getJSDOM();
		if (JSDOM) {
			return JSDOM.fragment(text).textContent || "";
		}
		// Fallback если JSDOM недоступен
		return text.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
	}

	public getCover(item: HTMLElement | null, className: string = ""): string {
		if (!item) {
			return "";
		}

		if (className) {
			const style = item.querySelector(className)?.getAttribute("style") || "";

			if (style && /background-image:\s?url\('?(.*?)'?\)/.test(style)) {
				return style.match(/background-image:\s?url\('?(.*?)'?\)/)![1].replace("&amp;", "&");
			}

			return item.querySelector("img")?.getAttribute("src") ?? "";
		}

		return item.querySelector("img")?.getAttribute("src") ?? "";
	}

	public cleanValue(value: string): string {
		if (!value) {
			return "";
		}

		return value.replaceAll(/'|\"/g, "").trim();
	}

	public getStyle(element: HTMLElement | null, regex: RegExp): string {
		if (!element) {
			return "";
		}

		const style = element.attributes?.style || "";
		const match = style.match(regex);

		return match ? match[1]?.replace("&amp;", "&") || "" : "";
	}

	public fixAvatar(avatar: string): string {
		if (!avatar) {
			return "";
		}

		return /https:\/\//.test(avatar)
			? avatar
			: `https://vk.ru${avatar}`;
	}

	public async loadCatalogSectionFromPage(link: string): Promise<TRawResponse<TGetCatalogSectionPayload>> {
		const page = await this.request<string>({}, link);

		// Попробуем различные паттерны для поиска sectionId
		let sectionId: string | null = null;

		// Паттерн 1: sectionId":"value"
		const match1 = page.match(/sectionId":"(.*?)"/);
		if (match1) {
			sectionId = match1[1];
		}

		// Паттерн 2: sectionId: "value"
		if (!sectionId) {
			const match2 = page.match(/sectionId:\s*"(.*?)"/);
			if (match2) {
				sectionId = match2[1];
			}
		}

		// Паттерн 3: "sectionId":"value" (с экранированием)
		if (!sectionId) {
			const match3 = page.match(/"sectionId":"(.*?)"/);
			if (match3) {
				sectionId = match3[1];
			}
		}

		// Паттерн 4: sectionId в window.__INITIAL_STATE__ или подобных структурах
		if (!sectionId) {
			const match4 = page.match(/sectionId["\s]*[:=]["\s]*([^"}\s]+)/);
			if (match4) {
				sectionId = match4[1];
			}
		}

		// Паттерн 5: поиск в JSON структурах
		if (!sectionId) {
			const jsonMatch = page.match(/<script[^>]*>[\s\S]*?({[\s\S]*?sectionId[\s\S]*?})[\s\S]*?<\/script>/);
			if (jsonMatch) {
				const parsed = (() => {
					try {
						return JSON.parse(jsonMatch[1]);
					} catch {
						return null;
					}
				})();
				if (parsed && typeof parsed === "object") {
					sectionId = parsed.sectionId || parsed.section_id || null;
				}
			}
		}

		if (!sectionId) {
			console.warn("Could not find sectionId in page, link:", link);

			// Fallback 1: попробуем использовать getSection вместо loadCatalogSection
			// если это страница general или похожая
			if (link.includes("general") || link.includes("catalog")) {
				const sectionResponse = await this.getSection<TGetSectionPayload>({
					owner_id: this.event.context.user.id,
					section: link.includes("general") ? "general" : "all"
				});

				// Преобразуем TGetSectionPayload в TGetCatalogSectionPayload
				return {
					...sectionResponse,
					payload: {
						0: 0,
						1: [sectionResponse.payload[1][0] as string, {
							playlist: sectionResponse.payload[1][1].playlist || {} as any,
							playlists: sectionResponse.payload[1][1].playlists || [],
							next_from: sectionResponse.payload[1][1].next_from || "",
							nextFrom: sectionResponse.payload[1][1].nextFrom || "",
							search_qurery: sectionResponse.payload[1][1].search_query || "",
							hints: [],
							searchParams: [],
							title: sectionResponse.payload[1][1].title || "",
							sectionId: sectionResponse.payload[1][1].sectionId || "",
							blockIds: sectionResponse.payload[1][1].blockIds || [],
							isBlockPagination: false,
							qid: null
						}]
					}
				};
			}

			// Fallback 2: для explore страниц используем прямой запрос через getSection
			// если в URL есть параметры block и section
			if (link.includes("block=") && link.includes("section=")) {
				const urlParams = new URLSearchParams(link.split("?")[1] || "");
				const block = urlParams.get("block");
				const section = urlParams.get("section");

				if (block && section) {
					// Для explore страниц используем прямой запрос
					// Вместо loadCatalogSection используем getSection с explore
					if (section === "explore") {
						const exploreResponse = await this.getSection<TGetSectionPayload>({
							owner_id: this.event.context.user.id,
							section: "explore"
						}).catch((e: Error) => {
							console.error("Failed to parse URL params in fallback:", e);
							return null;
						});

						if (exploreResponse) {
							// Преобразуем TGetSectionPayload в TGetCatalogSectionPayload
							return {
								...exploreResponse,
								payload: {
									0: 0,
									1: [exploreResponse.payload[1][0] as string, {
										playlist: exploreResponse.payload[1][1].playlist || {} as any,
										playlists: exploreResponse.payload[1][1].playlists || [],
										next_from: exploreResponse.payload[1][1].next_from || "",
										nextFrom: exploreResponse.payload[1][1].nextFrom || "",
										search_qurery: exploreResponse.payload[1][1].search_query || "",
										hints: [],
										searchParams: [],
										title: exploreResponse.payload[1][1].title || "",
										sectionId: exploreResponse.payload[1][1].sectionId || "",
										blockIds: exploreResponse.payload[1][1].blockIds || [],
										isBlockPagination: false,
										qid: null
									}]
								}
							};
						}
					}
				}
			}

			// Fallback 3: если ничего не помогло, возвращаем пустой ответ вместо ошибки
			// чтобы не ломать загрузку страницы
			console.error("Could not find sectionId and all fallbacks failed, link:", link);
			console.error("Page preview (first 1000 chars):", page.substring(0, 1000));

			// Возвращаем пустой ответ вместо ошибки
			return {
				langKeys: { global: [], local: {} },
				langVersion: "",
				loaderVersion: "",
				pageviewCandidate: false,
				payload: { 0: 0, 1: ["", { playlist: {} as any, playlists: [], next_from: "", nextFrom: "", search_qurery: "", hints: [], searchParams: [], title: "", sectionId: "", blockIds: [], isBlockPagination: false, qid: null }] },
				static: "",
				statsMeta: { hash: "", id: 0, platform: "", reloadVersion: 0, st: true, time: 0 },
				templates: { audio_bits_to_cls: "", _: "" }
			};
		}

		return await this.loadCatalogSection<TGetCatalogSectionPayload>({
			section_id: sectionId
		}).catch((error: Error) => {
			console.error("Failed to load catalog section, sectionId:", sectionId, "link:", link, error);
			
			return {
				langKeys: { global: [], local: {} },
				langVersion: "",
				loaderVersion: "",
				pageviewCandidate: false,
				payload: { 0: 0, 1: ["", { playlist: {} as any, playlists: [], next_from: "", nextFrom: "", search_qurery: "", hints: [], searchParams: [], title: "", sectionId: "", blockIds: [], isBlockPagination: false, qid: null }] },
				static: "",
				statsMeta: { hash: "", id: 0, platform: "", reloadVersion: 0, st: true, time: 0 },
				templates: { audio_bits_to_cls: "", _: "" }
			};
		});
	}

	public async getDataByBlock(context: BaseRequest, params: {
		block?: string;
		type?: string;
		audio_id?: string;
		section?: string;
		page?: boolean;
		count?: number;
		all?: boolean;
		raw?: boolean;
	}): Promise<{ list: TAudio[]; more: TMore }> {
		if (!params.block && !params.type && !params.audio_id) {
			throw createError({
				statusCode: 400,
				message: "You must to specify block, type or audio_id"
			});
		}

		// Для explore страниц используем прямой запрос через getSection
		// так как loadCatalogSectionFromPage не может найти sectionId для них
		let response: TRawResponse<TGetCatalogSectionPayload>;

		if (params.section === "explore") {
			const exploreResponse = await this.getSection<TGetSectionPayload>({
				owner_id: this.event.context.user.id,
				section: "explore"
			}).catch(async (e: Error) => {
				console.error("Failed to get explore section directly, falling back to loadCatalogSectionFromPage:", e);

				const urlParams: Record<string, string> = {
					section: params.section || "recoms"
				};

				if (params.block) {
					urlParams.block = params.block;
				}
				if (params.type) {
					urlParams.type = params.type;
				}
				if (params.audio_id) {
					urlParams.audio_id = params.audio_id;
				}

				return await this.loadCatalogSectionFromPage(`al_audio.php?${new URLSearchParams(urlParams).toString()}`);
			});

			response = exploreResponse as TRawResponse<TGetCatalogSectionPayload>;

			// Извлекаем нужный блок из ответа
			// Структура ответа: payload[1] содержит данные
			if (response && response.payload && response.payload[1]) {
				// Для explore страниц нужно найти нужный блок в ответе
				// Пока возвращаем весь ответ, builder должен обработать его правильно
			}
		} else {
			response = await this.loadCatalogSectionFromPage(`al_audio.php?${new URLSearchParams({
				...params,
				section: params.section || "recoms"
			} as any).toString()}`);
		}

		if (params.page) {
			return {
				list: [] as TAudio[],
				more: this.parseMore(response)
			};
		}

		if (!context.builder) {
			throw createError({
				statusCode: 500,
				message: "Builder function required"
			});
		}

		let list: TAudio[] = await context.builder<TGetCatalogSectionPayload, TAudio>(response) as TAudio[];
		let more = this.parseMore(response);

		if (params.count) {
			list = list.slice(0, params.count);
		} else if (params.all) {
			params.raw = true;

			while (this.validateMore(more)) {
				const data = await this.getDataWithMore(context, more, params);
				list = list.concat(data.list);
				more = data.more;
			}
		}

		return { list, more };
	}

	public async getDataWithMore(context: BaseRequest, more: TMore, params: {
		page?: boolean;
		count?: number;
	} = {}): Promise<{ list: TAudio[]; more: TMore }> {
		if (!this.validateMore(more)) {
			throw createError({
				statusCode: 400,
				message: "Pass a valid \"more\" object"
			});
		}

		const response = await this.loadCatalogSection(more);

		if (params.page) {
			return {
				list: [] as TAudio[],
				more: this.parseMore(response)
			};
		}

		if (!context.builder) {
			throw createError({
				statusCode: 500,
				message: "Builder function required"
			});
		}

		const catalogResponse = response as TRawResponse<TGetCatalogSectionPayload>;

		// Проверяем, что payload[1] - это кортеж [string, {...}]
		if (Array.isArray(catalogResponse.payload[1]) && catalogResponse.payload[1].length > 0 && typeof catalogResponse.payload[1][0] === "string" && catalogResponse.payload[1][1] && typeof catalogResponse.payload[1][1] === "object") {
			const playlistData = catalogResponse.payload[1][1] as { playlist?: { list?: TRawAudio[] } };
			if (playlistData.playlist && Array.isArray(playlistData.playlist.list) && playlistData.playlist.list.length === 0) {
				await new Promise(resolve => setTimeout(resolve, 500));
				return await this.getDataWithMore(context, more, params);
			}
		}

		let list: TAudio[] = await context.builder<TGetCatalogSectionPayload, TAudio>(catalogResponse) as TAudio[];

		if (params.count) {
			list = list.slice(0, params.count);
		}

		const moreData = Array.isArray(catalogResponse.payload[1]) && catalogResponse.payload[1].length > 1 && catalogResponse.payload[1][1] && typeof catalogResponse.payload[1][1] === "object"
			? catalogResponse.payload[1][1]
			: null;

		return {
			list,
			more: moreData ? this.parseMore(moreData) : this.parseMore(catalogResponse)
		};
	}

	public validateMore(more: TMore | null): boolean {
		return Boolean(more)
			&& Boolean((more as TMore).section_id)
			&& Boolean((more as TMore).next_from || (more as TMore).start_from);
	}
}