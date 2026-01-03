import { BaseRequest } from "~~/server/utils/base";

import { ERawAudio, EAudioFlags, TGetAudioParams, TParsedPayload } from "./types";
import { IRequest, TPayload, TRawResponse, TGetCatalogSectionPayload, TGetGeneralSectionPayload } from "~~/server/utils/types";

import type { EventHandlerRequest, H3Event } from "h3";

import type { TReloadAudiosPayload, TAudio, TRawAudio } from "./types";

const n = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMN0PQRSTUVWXYZO123456789+/=";
const unavailableRegex = /audio_api_unavailable/;
const oldRegex = /data-audio=\"(.*?)\" on/;

class AudioRequests extends BaseRequest implements IRequest {
	constructor(event: H3Event<EventHandlerRequest>) {
		super(event);
	}

	public async parseAudios(rawAudios: TRawAudio[], params: TGetAudioParams = {}): Promise<TAudio[]> {
		if (rawAudios.length === 0) {
			return [];
		}

		if ("count" in params) {
			rawAudios = rawAudios.slice(0, params.count);
		}

		return !params.raw
			? await this.normalize(rawAudios, params)
			: await this.getRawAudios(rawAudios)
	}

	public async parsePayload<T extends TGetCatalogSectionPayload | TGetGeneralSectionPayload>(payload: TPayload<T>, params: TGetAudioParams = {}): Promise<TParsedPayload> {
		if (!payload[1]?.[1]?.playlist) {
			return {
				audios: [],

				more: {
					next_from: "",
					section_id: "",
					start_from: ""
				}
			};
		}

		return {
			audios: await this.parseAudios(payload[1][1].playlist.list, params),
			more: this.parseMore(payload[1][1])
		};
	}

	protected async normalize(rawAudios: TRawAudio[], params: TGetAudioParams = {}): Promise<TAudio[]> {
		if (params.raw) {
			return await Promise.all(rawAudios.map(audioItem => {
				return this.formatAudio(audioItem);
			}));
		}

		if (rawAudios.length === 0) {
			return [];
		}

		let restrictedIndexes: number[] = [];

		// Если не требуется получать URL, сразу форматируем все аудио
		if (params.withUrls === false) {
			const formattedAudios = await Promise.all(rawAudios.map(async (audioItem, index) => {
				if (!audioItem[ERawAudio.HASHES] || !audioItem[ERawAudio.HASHES].split("/")[5]) {
					restrictedIndexes.push(index);
				}
				// Создаем копию audio без URL, чтобы formatAudio не обрабатывал его
				const audioWithoutUrl = [...audioItem] as TRawAudio;
				audioWithoutUrl[ERawAudio.URL] = "";
				return await this.formatAudio(audioWithoutUrl);
			}));

			// Получаем названия альбомов для треков, где album - это массив
			await this.enrichAlbums(formattedAudios);
			return formattedAudios;
		}

		const ids = rawAudios.map((audioItem, index) => {
			const splittedHash = (audioItem[ERawAudio.HASHES] || "").split("/");

			if (!splittedHash[5]) {
				restrictedIndexes.push(index);
				return null;
			}

			return `${audioItem[ERawAudio.OWNER_ID]}_${audioItem[ERawAudio.ID]}_${splittedHash[2]}_${splittedHash[5]}`;
		}).filter(Boolean) as unknown as string[];

		// Если нет ID для загрузки, возвращаем пустой массив
		if (ids.length === 0) {
			return [];
		}

		const fetchedAudios = await this.reloadAudios(ids);

		// Проверяем, что fetchedAudios является массивом
		if (!Array.isArray(fetchedAudios)) {
			return [];
		}

		const formattedAudios = await Promise.all(rawAudios.map(async (audioItem, index) => {
			if (!restrictedIndexes.includes(index)) {
				const fetchedAudio = fetchedAudios.find(fetchedAudioItem => {
					return `${fetchedAudioItem[ERawAudio.OWNER_ID]}_${fetchedAudioItem[ERawAudio.ID]}` === `${audioItem[ERawAudio.OWNER_ID]}_${audioItem[ERawAudio.ID]}`;
				});

				if (fetchedAudio) {
					const merged: TRawAudio = audioItem.map((propertyItem, propIndex) => {
						// Для ALBUM приоритет отдаем fetchedAudio (данные после reload_audios)
						if (propIndex === ERawAudio.ALBUM) {
							const fetchedAlbum = fetchedAudio[ERawAudio.ALBUM];
							// Если в fetchedAudio album - объект или строка, используем его
							if (fetchedAlbum && typeof fetchedAlbum === "object" && !Array.isArray(fetchedAlbum)) {
								return fetchedAlbum;
							}
							if (fetchedAlbum && typeof fetchedAlbum === "string" && fetchedAlbum.trim()) {
								return fetchedAlbum;
							}
						// Иначе используем исходное значение
						return propertyItem || fetchedAlbum;
					}
					// Для остальных полей используем стандартную логику мерджа
					return propertyItem || fetchedAudio[propIndex];
				}) as TRawAudio;

				return await this.formatAudio(merged);
			}
		}

		return await this.formatAudio(audioItem);
	}));

		// Получаем названия альбомов для треков, где album - это массив
		await this.enrichAlbums(formattedAudios);
		return formattedAudios;
	}

	protected async enrichAlbums(audios: TAudio[]): Promise<void> {
		// Собираем уникальные album IDs (массивы [owner_id, playlist_id, access_hash] или объекты без title)
		const albumMap = new Map<string, { owner_id: number; playlist_id: number; access_hash: string; audios: TAudio[] }>();

		audios.forEach(audio => {
			if (!audio.album) {
				return;
			}

			let owner_id: number | undefined;
			let playlist_id: number | undefined;
			let access_hash: string | undefined;

			if (Array.isArray(audio.album) && audio.album.length >= 3) {
				const albumArray = audio.album as any[];
				owner_id = albumArray[0] !== null && albumArray[0] !== undefined ? Number(albumArray[0]) : undefined;
				playlist_id = albumArray[1] !== null && albumArray[1] !== undefined ? Number(albumArray[1]) : undefined;
				access_hash = albumArray[2] !== null && albumArray[2] !== undefined ? String(albumArray[2]) : undefined;
			} else if (typeof audio.album === "object" && audio.album !== null && !Array.isArray(audio.album)) {
				// Объект альбома - проверяем, есть ли title
				const albumObj = audio.album as { owner_id?: number; ownerId?: number; id?: number; access_hash?: string; accessHash?: string; access_key?: string; accessKey?: string; title?: string };
				
				if (albumObj.title) {
					// Альбом уже обогащен, пропускаем
					return;
				}

				// Альбом - объект без title, нужно обогатить
				owner_id = albumObj.owner_id || albumObj.ownerId;
				playlist_id = albumObj.id;
				access_hash = albumObj.access_hash || albumObj.accessHash || albumObj.access_key || albumObj.accessKey || "";
			} else {
				// Альбом - строка или другой тип, пропускаем
				return;
			}

			if (owner_id === undefined || owner_id === null || playlist_id === undefined || playlist_id === null) {
				return;
			}

			const key = `${owner_id}_${playlist_id}`;

			if (!albumMap.has(key)) {
				albumMap.set(key, {
					owner_id: owner_id as number,
					playlist_id: playlist_id as number,
					access_hash: access_hash || "",
					audios: []
				});
			}

			albumMap.get(key)!.audios.push(audio);
		});

		if (albumMap.size === 0) {
			return;
		}

		// Для каждого уникального альбома получаем информацию
		const { getPlaylistsRequestsInstance } = await import("~~/server/api/vk/playlists/playlists");

		// Обрабатываем альбомы батчами по 5, чтобы не перегружать API
		const albumEntries = Array.from(albumMap.values()).filter(album => {
			return album.owner_id !== null && album.owner_id !== undefined
				&& album.playlist_id !== null && album.playlist_id !== undefined;
		});

		if (albumEntries.length === 0) {
			return;
		}

		const batchSize = 5;

		for (let i = 0; i < albumEntries.length; i += batchSize) {
			const batch = albumEntries.slice(i, i + batchSize);

			await Promise.all(batch.map(async (albumInfo) => {
				if (!albumInfo.playlist_id || albumInfo.playlist_id === null || albumInfo.playlist_id === undefined) {
					return;
				}

				const playlistsRequests = getPlaylistsRequestsInstance(this.event);

				const playlist = await playlistsRequests.getPlaylist({
					owner_id: albumInfo.owner_id,
					playlist_id: albumInfo.playlist_id,
					access_hash: albumInfo.access_hash,
					list: false
				}).catch((e: Error) => {
					// Если не удалось получить информацию об альбоме, оставляем как есть
					console.error(`enrichAlbums: Failed to enrich album ${albumInfo.owner_id}_${albumInfo.playlist_id}:`, e.message || e);
					return null;
				});
				if (!playlist) {
					return;
				}

				// Если плейлист существует, но title пустой, используем пустую строку или не обогащаем
				// Но лучше обогатить с пустым title, чем оставить массив
				if (!playlist.title) {
					// Пробуем использовать другие поля для названия
					const fallbackTitle = playlist.raw_description || playlist.description || "";
					if (!fallbackTitle) {
						// Если нет названия вообще, пропускаем обогащение
						return;
					}
					playlist.title = fallbackTitle;
				}

				// Обновляем album для всех треков с этим альбомом
				albumInfo.audios.forEach(audio => {
					if (!audio.album) {
						return;
					}

					// Обновляем альбом независимо от его текущего формата
					audio.album = {
						owner_id: albumInfo.owner_id,
						id: albumInfo.playlist_id,
						access_key: albumInfo.access_hash,
						access_hash: albumInfo.access_hash,
						title: playlist.title,
						thumb: playlist.cover_url ? {
							photo_300: playlist.cover_url,
							photo_600: playlist.cover_url,
							photo_1200: playlist.cover_url
						} : undefined
					};
				});
			}));
		}
	}

	public async reloadAudios(ids: string[]): Promise<TRawAudio[]> {
		if (ids.length === 0) {
			return [];
		}

		const request = async () => await this.request<TRawResponse<TReloadAudiosPayload>>({
			act: "reload_audios",
			al: 1,
			audio_ids: ids.join(",")
		});

		let response = await request();

		while (!response || /no_audios/.test(response.payload[1][0] as string)) {
			response = await request();
		}

		const result = response.payload[1]?.[0];
		
		// Проверяем, что результат является массивом
		if (!Array.isArray(result)) {
			return [];
		}

		return result as TRawAudio[];
	}

	public async getById(params: { ids: string }): Promise<TRawAudio[]> {
		const ids = params.ids.split(",").map(id => id.trim());
		return await this.reloadAudios(ids);
	}

	protected async formatAudio(audio: TRawAudio): Promise<TAudio> {
		const source = audio[ERawAudio.URL]
			? await this.exposeSource(audio[ERawAudio.URL])
			: "";

		const hashes = (audio[ERawAudio.HASHES] || "").split("/");
		const covers = (audio[ERawAudio.COVER_URL] || "").split(",");
		const flags = audio[ERawAudio.FLAGS] || 0;

		let extra: Record<string, unknown> = {};
		if (audio[ERawAudio.EXTRA_JSON]) {
			const parseResult = (() => {
				try {
					return JSON.parse(audio[ERawAudio.EXTRA_JSON]);
				} catch {
					return null;
				}
			})();
			
			if (parseResult && typeof parseResult === "object") {
				extra = parseResult as Record<string, unknown>;
			}
		}

		const additional = this.getAdditionalInfo(audio);

		const rawAlbum = audio[ERawAudio.ALBUM];
		let album: string | [number, number, string] | {
			owner_id: number;
			id: number;
			access_key?: string;
			access_hash?: string;
			title?: string;
			thumb?: {
				photo_300?: string;
				photo_600?: string;
				photo_1200?: string;
			};
		} | undefined;

		// Обработка album: сначала проверяем rawAlbum (может быть объектом после reload_audios), затем extra.album
		// В старом коде album просто присваивается из массива, но после reload_audios может быть объект с title

		// 1. Проверяем rawAlbum - после reload_audios там может быть объект с title
		if (rawAlbum) {
			if (typeof rawAlbum === "string" && rawAlbum.trim()) {
				album = rawAlbum;
			} else if (typeof rawAlbum === "object" && rawAlbum !== null && !Array.isArray(rawAlbum)) {
				// Объект с информацией об альбоме (после reload_audios)
				album = {
					owner_id: rawAlbum.owner_id || rawAlbum.ownerId || 0,
					id: rawAlbum.id || 0,
					access_key: rawAlbum.access_key || rawAlbum.accessKey || "",
					access_hash: rawAlbum.access_hash || rawAlbum.accessHash || "",
					title: rawAlbum.title ? this.unescape(rawAlbum.title) : undefined,
					thumb: rawAlbum.thumb
				};
			} else if (Array.isArray(rawAlbum) && rawAlbum.length >= 3) {
				// Массив [owner_id, playlist_id, access_hash]
				// Проверяем extra.album - там может быть title
				if (extra && extra.album && typeof extra.album === "object" && !Array.isArray(extra.album)) {
					const extraAlbum = extra.album as any;
					if (extraAlbum.title) {
						album = {
							owner_id: extraAlbum.owner_id || extraAlbum.ownerId || rawAlbum[0],
							id: extraAlbum.id || rawAlbum[1],
							access_key: extraAlbum.access_key || extraAlbum.accessKey || rawAlbum[2],
							access_hash: extraAlbum.access_hash || extraAlbum.accessHash || rawAlbum[2],
							title: this.unescape(extraAlbum.title),
							thumb: extraAlbum.thumb
						};
					} else {
						album = [rawAlbum[0], rawAlbum[1], rawAlbum[2]];
					}
				} else {
					album = [rawAlbum[0], rawAlbum[1], rawAlbum[2]];
				}
			}
		}

		// 2. Если album еще не установлен, проверяем extra.album
		if (!album && extra && extra.album) {
			if (typeof extra.album === "object" && extra.album !== null && !Array.isArray(extra.album)) {
				const extraAlbum = extra.album as any;
				if (extraAlbum.title) {
					album = {
						owner_id: extraAlbum.owner_id || extraAlbum.ownerId || 0,
						id: extraAlbum.id || 0,
						access_key: extraAlbum.access_key || extraAlbum.accessKey || "",
						access_hash: extraAlbum.access_hash || extraAlbum.accessHash || "",
						title: this.unescape(extraAlbum.title),
						thumb: extraAlbum.thumb
					};
				}
			} else if (typeof extra.album === "string" && extra.album.trim()) {
				album = extra.album;
			}
		}

		return {
			id: audio[ERawAudio.ID],
			owner_id: audio[ERawAudio.OWNER_ID],
			full_id: `${audio[ERawAudio.OWNER_ID]}_${audio[ERawAudio.ID]}`,
			title: this.unescape(audio[ERawAudio.TITLE] || ""),
			performer: this.unescape(audio[ERawAudio.PERFORMER] || ""),
			artist: this.unescape(audio[ERawAudio.PERFORMER] || ""),
			duration: audio[ERawAudio.DURATION] || 0,
			url: source,
			covers: (audio[ERawAudio.COVER_URL] || "").replaceAll("&amp;", "&"),
			coverUrl_s: covers[0]?.replaceAll("&amp;", "&") || "",
			coverUrl_p: covers[1]?.replaceAll("&amp;", "&") || "",
			cover: covers[0]?.replaceAll("&amp;", "&") || "",
			is_restriction: Boolean(audio[ERawAudio.RESTRICTION]),
			lyrics: Boolean(audio[ERawAudio.LYRICS]),
			hq: !!(flags & EAudioFlags.HQ_BIT),
			claimed: !!(flags & EAudioFlags.CLAIMED_BIT),
			uma: !!(flags & EAudioFlags.UMA_BIT),
			album_id: audio[ERawAudio.ALBUM_ID],
			explicit: !!(flags & EAudioFlags.EXPLICIT_BIT),
			subtitle: this.unescape(audio[ERawAudio.SUBTITLE] || ""),
			add_hash: hashes[0] || "",
			edit_hash: hashes[1] || "",
			action_hash: hashes[2] || "",
			delete_hash: hashes[3] || "",
			replace_hash: hashes[4] || "",
			can_edit: !!hashes[1],
			can_delete: !!hashes[3],
			can_add: !!(flags & EAudioFlags.CAN_ADD_BIT),
			track_code: audio[ERawAudio.TRACK_CODE] || "",
			ads: audio[ERawAudio.ADS] || 0,
			album,
			replaceable: !!(flags & EAudioFlags.REPLACEABLE),
			context: audio[ERawAudio.CONTEXT] || "",
			...additional
		};
	}

	protected getAdditionalInfo(audio: TRawAudio): Partial<TAudio> {
		const additional: Partial<TAudio> = {};

		if (audio[ERawAudio.MAIN_ARTISTS] && Array.isArray(audio[ERawAudio.MAIN_ARTISTS])) {
			additional.artists = audio[ERawAudio.MAIN_ARTISTS].map((artist: any) => ({
				id: artist.id || artist[0] || "",
				name: this.unescape(artist.name || artist[1] || ""),
				cover: artist.cover || artist[2] || "",
				link: artist.link || artist[3] || ""
			}));
		}

		if (audio[ERawAudio.FEAT_ARTISTS] && Array.isArray(audio[ERawAudio.FEAT_ARTISTS])) {
			additional.feat = audio[ERawAudio.FEAT_ARTISTS].map((artist: any) => ({
				id: artist.id || artist[0] || "",
				name: this.unescape(artist.name || artist[1] || ""),
				cover: artist.cover || artist[2] || "",
				link: artist.link || artist[3] || ""
			}));
		}

		if (audio[ERawAudio.CHART]) {
			additional.chart = audio[ERawAudio.CHART];
		}

		return additional;
	}

	protected async getRawAudios(rawAudios: TRawAudio[]): Promise<TAudio[]> {
		return await Promise.all(rawAudios.map(async audioItem => ({
			raw: audioItem,
			...(await this.formatAudio(audioItem))
		})));
	}

	protected async exposeSource(e: string): Promise<string> {
		const s = (e: string, t: number): number[] => {
			const i: number[] = [];

			if (e.length > 0) {
				t = Math.abs(t);

				for (let o = e.length; o-- > 0;) {
					t = ((e.length * o + e.length) ^ t + o) % e.length;
					i[o] = t;
				}
			}

			return i;
		};

		type TTransformOperations = {
			v: (e: string) => string;
			r: (e: string, t: number) => string;
			s: (e: string, t: number) => string;
			i: (e: string, t: number) => Promise<string>;
			x: (e: string, t: string) => string[];
			[key: string]: ((...args: any[]) => any) | ((...args: any[]) => Promise<any>);
		};

		const i: TTransformOperations = {
			v: (e: string): string => {
				return e.split("").reverse().join("");
			},

			r: (e: any, t: number): string => {
				e = e.split("");

				for (let i: any, o = n + n, r = e.length; r; r--) {
					i = ~i && (e[r] = o.substring(i - t, 1));
				}

				return e.join("");
			},

			s: (e: any, t: number): string => {
				if (e.length > 0) {
					const i = s(e, t);
					let o = 0;
					for (e = e.split(""); ++o < e.length;) e[o] = e.splice(i[e.length - 1 - o], 1, e[o])[0];
					e = e.join("");
				}

				return e;
			},

			i: async (e: string, t: number): Promise<string> => {
				return i.s(e, t ^ this.event.context.user.id);
			},

			x: (e: string, t: string): string[] => {
				return e.split("").map((_: string, i: any) => {
					return String.fromCharCode(i.charCodeAt(0) ^ t.charCodeAt(0));
				});
			}
		};

		const a = (e: string): string | false => {
			if (!e || e.length % 4 === 1) {
				return false;
			}

			let a = "";
			for (let t: any, i: any, o = 0, r = 0; (i = e.charAt(r++));) {
				i = n.indexOf(i);
				i = ~i && (t = o % 4 ? 64 * t + i : i, o++ % 4) && (a += String.fromCharCode(255 & t >> (-2 * o & 6)));
			}

			return a;
		};

		return (async () => {
			if (unavailableRegex.test(e)) {
				const [, splitted] = e.split("?extra=");
				let t: any = splitted ? splitted.split("#") : e.split("?extra")[0];
				const alter = splitted ? t[1] : t[0];

				let n: any = !alter.length ? "" : a(alter);
				t = a(t[0]);
				if (typeof n !== "string" || !t) return e;
				n = n ? n.split(String.fromCharCode(9)) : [];

				for (let r: any, s: any, l = n.length; l--;) {
					s = n[l].split(String.fromCharCode(11));
					r = s.splice(0, 1, t)[0];
					if (!i[r]) return e;
					const func = i[r];
					if (typeof func === "function") {
						t = await func(...s);
					} else {
						return e;
					}
				}

				if (t?.substr(0, 4) === "http") {
					return t;
				}
			}

			return e;
		})();
	}

	public async builder<T, K>(response: TRawResponse<T>): Promise<K[]> {
		const catalogResponse = response as TRawResponse<TGetCatalogSectionPayload | TGetGeneralSectionPayload>;
		const rawAudios: TRawAudio[] = catalogResponse.payload[1][1]?.playlist?.list || [];

		return await this.parseAudios(rawAudios) as K[];
	}

	protected builderHTML(html: string): TRawAudio[] {
		if (!html) {
			return [];
		}

		const useRegex = oldRegex.test(html)
			? /data-audio=\"(.*?)\" on/g
			: /data-audio=\"(.*?)\" data/g;

		const match = html.matchAll(useRegex);

		return Array.from(match, ([, object]) => {
			const unescaped = this.unescape(object);
			return JSON.parse(unescaped) as TRawAudio;
		});
	}

	public async getReorderHash(): Promise<string> {
		const response = await this.request<string>({});

		const reorderHashMatch = response.match(/"audiosReorderHash":"(.*?)"/);
		if (!reorderHashMatch) {
			return "";
		}

		return reorderHashMatch[1].replace(/"/g, "");
	}

	public async queue(audio: TAudio): Promise<any> {
		if (!audio) {
			throw createError({
				statusCode: 400,
				message: "You must to pass audio object"
			});
		}

		return await this.request({
			act: "queue_params",
			al: 1,
			audio_id: audio.id,
			hash: audio.action_hash || "",
			owner_id: audio.owner_id
		});
	}

	public async playback(audio: TAudio): Promise<any> {
		if (!audio) {
			throw createError({
				statusCode: 400,
				message: "You must to pass audio object"
			});
		}

		const uuid = this.http.uuid || "";

		return await this.request({
			act: "start_playback",
			al: 1,
			audio_id: audio.id,
			hash: audio.action_hash || "",
			owner_id: audio.owner_id,
			uuid
		});
	}

	public async getFromWall(params: { owner_id: number; post_id: number; raw?: boolean }): Promise<TAudio[]> {
		if (!params.owner_id || !params.post_id) {
			throw createError({
				statusCode: 400,
				message: "You must to specify owner id and post id"
			});
		}

		const response = await this.request<TRawResponse<TGetCatalogSectionPayload | TGetGeneralSectionPayload>>({}, `wall${params.owner_id}_${params.post_id}`);

		console.log(`[getFromWall] Post ${params.post_id}, owner ${params.owner_id}`);
		console.log(`[getFromWall] Response:`, JSON.stringify(response, null, 2).substring(0, 500));

		if (!response || !response.payload) {
			console.log(`[getFromWall] No response or payload`);
			return [];
		}

		const payload = response.payload[1];
		
		if (!payload) {
			console.log(`[getFromWall] No payload[1]`);
			return [];
		}

		console.log(`[getFromWall] Payload type:`, Array.isArray(payload) ? "array" : typeof payload);
		console.log(`[getFromWall] Payload keys:`, typeof payload === "object" && payload !== null ? Object.keys(payload) : "N/A");

		let rawAudios: TRawAudio[] = [];

		if (Array.isArray(payload)) {
			console.log(`[getFromWall] Payload is array, length:`, payload.length);
			if (payload[1] && typeof payload[1] === "object" && "playlist" in payload[1]) {
				rawAudios = (payload[1] as any).playlist?.list || [];
				console.log(`[getFromWall] Found audios in array[1].playlist.list:`, rawAudios.length);
			}
		} else if (typeof payload === "object" && payload !== null) {
			if ("playlist" in payload) {
				rawAudios = (payload as any).playlist?.list || [];
				console.log(`[getFromWall] Found audios in playlist.list:`, rawAudios.length);
			} else if ("list" in payload) {
				rawAudios = (payload as any).list || [];
				console.log(`[getFromWall] Found audios in list:`, rawAudios.length);
			} else {
				console.log(`[getFromWall] No playlist or list in payload`);
			}
		}

		console.log(`[getFromWall] Total raw audios:`, rawAudios.length);

		const parsed = await this.parseAudios(rawAudios, {
			raw: params.raw || false
		});

		console.log(`[getFromWall] Parsed audios:`, parsed.length);

		return parsed;
	}
};

export const getAudioRequestsInstance = (event: H3Event<EventHandlerRequest>): AudioRequests => {
	return new AudioRequests(event);
};