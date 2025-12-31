import { BaseRequest } from "~~/server/utils/base";
import { getAudioRequestsInstance } from "~~/server/api/vk/audio/audio";

import HTMLParser from "node-html-parser";

import { getHeader } from "h3";
import type { EventHandlerRequest, H3Event } from "h3";
import type { TPlaylist, TMore, TPlaylistCollection } from "~~/server/utils/types";
import { IRequest, TPayload, TRawResponse, TGetCatalogSectionPayload } from "~~/server/utils/types";

class PlaylistsRequests extends BaseRequest implements IRequest {
	constructor(event: H3Event<EventHandlerRequest>) {
		super(event);
	}

	public async builder<T, K>(response: TRawResponse<T>): Promise<K[]> {
		const catalogResponse = response as TRawResponse<TGetCatalogSectionPayload>;
		const playlists = catalogResponse.payload[1][1]?.playlists || [];

		return playlists.map(playlist => this.getPlaylistInfo(playlist)) as K[];
	}

	public getPlaylistInfo(playlist: any): TPlaylist {
		const covers = playlist.gridCovers
			? Array.from((playlist.gridCovers || "").matchAll(/background-image:url\('?(.*?)'?\)/g), ([, link]) => link)
			: [];

		const result = {
			owner_id: playlist.owner_id || playlist.ownerId,
			playlist_id: playlist.playlist_id || playlist.id,
			raw_id: playlist.raw_id || `${playlist.ownerId}_${playlist.id}`,
			title: this.unescape(playlist.title || ""),
			cover_url: playlist.coverUrl || playlist.thumb || "",
			description: playlist.description ? this.unescape(playlist.description) : "",
			raw_description: playlist.rawDescription,
			size: Number(playlist.size) || Number(playlist.totalCount) || 0,
			listens: Number(playlist.listens) || 0,
			last_updated: playlist.lastUpdated || playlist.last_updated || 0,
			explicit: playlist.explicit ?? Boolean(playlist.isExplicit) ?? false,
			followed: playlist.followed || Boolean(playlist.isFollowed) || Boolean(playlist.is_followed),
			official: playlist.official ?? Boolean(playlist.isOfficial) ?? Boolean(playlist.is_official),
			restricted: Boolean(playlist.restricted),
			access_hash: playlist.accessHash || playlist.access_hash || "",
			follow_hash: playlist.followHash || playlist.follow_hash || "",
			edit_hash: playlist.editHash || playlist.edit_hash || "",
			context: playlist.context || playlist.type || "",
			covers,
			author: this.getAuthor(playlist)
		};

		return result;
	}

	protected getAuthor(playlist: any): TPlaylist["author"] {
		const authorLine = playlist.authorLine || playlist.authorName;

		if (!authorLine) {
			return undefined;
		}

		const authorLinkRegex = /href=\"(.*?)\"/;
		const authorNameRegex = />(.*?)</;

		if (!authorLinkRegex.test(authorLine) || !authorNameRegex.test(authorLine)) {
			return undefined;
		}

		const link = authorLine.match(authorLinkRegex)![1];
		const id = link.replaceAll("https://vk.ru", "").replace("/audios", "");

		return {
			id: Number(id) || id || link,
			name: this.unescape(authorLine.match(authorNameRegex)![1])
		};
	}

	public async get(params: { owner_id?: number; offset?: number; access_hash?: string } = {}): Promise<{ count: number; playlists: TPlaylist[] }> {
		const owner_id = params.owner_id || this.event.context.user.id;

		const startTime = Date.now();
		const requestForm = {
			access_hash: params.access_hash || "",
			act: "owner_playlists",
			al: 1,
			is_attach: 0,
			offset: params.offset || 0,
			owner_id,
			isPlaylist: true
		};

		const response = await this.request<TRawResponse<any>>(requestForm);

		if (!response) {
			throw createError({
				statusCode: 500,
				message: "Empty response from VK"
			});
		}

		if (typeof response === "string") {
			const responseStr = response as string;
			throw createError({
				statusCode: 500,
				message: "VK returned HTML instead of JSON",
				data: { responsePreview: responseStr.substring(0, 200) }
			});
		}

		if (Array.isArray(response)) {
			throw createError({
				statusCode: 500,
				message: "VK returned array instead of object",
				data: { responseLength: response.length }
			});
		}

		if (typeof response !== "object" || response === null) {
			throw createError({
				statusCode: 500,
				message: `Invalid response type. Expected object, got ${typeof response}`,
				data: { responseType: typeof response }
			});
		}

		if (!("payload" in response) || !response.payload) {
			throw createError({
				statusCode: 500,
				message: "Invalid response structure from VK: missing payload",
				data: { responseKeys: Object.keys(response) }
			});
		}

		const payload = response.payload[1];

		if (!payload) {
			return {
				count: 0,
				playlists: []
			};
		}

		let pl_objects: any[] = [];
		let count: number = 0;

		if (Array.isArray(payload)) {
			if (payload.length === 0) {
				return {
					count: 0,
					playlists: []
				};
			}
			
			if (payload.length === 1) {
				const firstElement = payload[0];
				if (Array.isArray(firstElement)) {
					pl_objects = firstElement;
					count = firstElement.length;
				} else if (typeof firstElement === "object" && firstElement !== null) {
					if ("playlists" in firstElement && Array.isArray(firstElement.playlists)) {
						pl_objects = firstElement.playlists;
						count = firstElement.count || firstElement.totalCount || pl_objects.length;
					} else {
						pl_objects = [firstElement];
						count = 1;
					}
				} else {
					return {
						count: 0,
						playlists: []
					};
				}
			} else if (payload.length >= 2) {
				const [first, second] = payload;
				if (Array.isArray(first) && typeof second === "number") {
					pl_objects = first;
					count = second;
				} else if (Array.isArray(first) && Array.isArray(second)) {
					pl_objects = first;
					count = second.length;
				} else if (Array.isArray(first)) {
					pl_objects = first;
					count = typeof second === "number" ? second : first.length;
				} else if (typeof first === "object" && first !== null && "playlists" in first) {
					pl_objects = first.playlists || [];
					count = typeof second === "number" ? second : (first.count || first.totalCount || pl_objects.length);
				} else if (Array.isArray(first)) {
					pl_objects = first;
					count = typeof second === "number" ? second : first.length;
				} else {
					pl_objects = Array.isArray(first) ? first : (first ? [first] : []);
					count = typeof second === "number" ? second : pl_objects.length;
				}
			}
		} else if (payload && typeof payload === "object") {
			if ("playlists" in payload && Array.isArray(payload.playlists)) {
				pl_objects = payload.playlists;
				count = payload.count || payload.totalCount || pl_objects.length;
			} else {
				throw createError({
					statusCode: 500,
					message: `Unexpected payload structure. Expected array or object with playlists, got ${typeof payload}`,
					data: { 
						payloadType: typeof payload, 
						payloadKeys: payload && typeof payload === "object" ? Object.keys(payload) : null,
						payloadPreview: JSON.stringify(payload).substring(0, 500)
					}
				});
			}
		} else {
			throw createError({
				statusCode: 500,
				message: `Unexpected payload type. Expected array or object, got ${typeof payload}`,
				data: { payloadType: typeof payload, payload }
			});
		}

		if (typeof pl_objects === "string") {
			const errorMessage = pl_objects;
			if (/Access denied/i.test(errorMessage)) {
			throw createError({
				statusCode: 403,
					message: "Access Denied",
					data: { errorMessage }
				});
			}
			throw createError({
				statusCode: 500,
				message: `VK returned error string: ${errorMessage}`,
				data: { errorMessage }
			});
		}

		if (!Array.isArray(pl_objects)) {
			return {
				count: Number(count) || 0,
				playlists: []
			};
		}

		return {
			count: Number(count) || 0,
			playlists: pl_objects.map((playlist: any) => this.getPlaylistInfo(playlist))
		};
	}

	public async getPlaylistById(params: {
		owner_id: number;
		playlist_id: number;
		access_key?: string;
		extra_fields?: string;
		ref?: string;
	}): Promise<{
		playlist: any;
		profiles?: any[];
		duration?: number;
	}> {
		const apiParams: Record<string, any> = {
			playlist_id: params.playlist_id,
			owner_id: params.owner_id,
			extra_fields: params.extra_fields || "owner,duration"
		};

		if (params.access_key) {
			apiParams.access_key = params.access_key;
		}

		if (params.ref) {
			apiParams.ref = params.ref;
		}

		const response = await this.callVKAPI("audio.getPlaylistById", apiParams);

		return response;
	}

	public async getIdsBySource(params: {
		source: string;
		entity_id: string;
		ref?: string;
	}): Promise<Array<{
		audio_id: string;
		track_code: string;
	}>> {
		const apiParams: Record<string, any> = {
			source: params.source,
			entity_id: params.entity_id
		};

		if (params.ref) {
			apiParams.ref = params.ref;
		}

		const response = await this.callVKAPI("audio.getIdsBySource", apiParams);

		return response.audios || [];
	}

	public async getPlaylist(params: {
		owner_id?: number;
		playlist_id: number;
		access_hash?: string;
		list?: boolean;
		count?: number;
		offset?: number;
		_triedFromList?: boolean;
	}): Promise<TPlaylist> {
		const owner_id = params.owner_id || this.event.context.user.id;

		// Пробуем использовать новый API
		const access_key = params.access_hash || "";

		const playlistResponse = await this.getPlaylistById({
			owner_id,
			playlist_id: params.playlist_id,
			access_key,
			extra_fields: "owner,duration"
		}).catch(() => null);

		if (playlistResponse && playlistResponse.playlist) {
			const vkPlaylist = playlistResponse.playlist;

			// Преобразуем ответ VK API в формат TPlaylist
			const playlist: TPlaylist = {
				owner_id: vkPlaylist.owner_id,
				playlist_id: vkPlaylist.id,
				raw_id: `${vkPlaylist.owner_id}_${vkPlaylist.id}`,
				title: this.unescape(vkPlaylist.title || ""),
				cover_url: vkPlaylist.photo?.photo_300 || vkPlaylist.photo?.photo_600 || "",
				description: this.unescape(vkPlaylist.description || ""),
				raw_description: vkPlaylist.description || "",
				size: vkPlaylist.count || 0,
				listens: vkPlaylist.plays || 0,
				last_updated: vkPlaylist.update_time || 0,
				explicit: false,
				followed: vkPlaylist.is_following || false,
				official: false,
				restricted: false,
				access_hash: vkPlaylist.access_key || params.access_hash || "",
				follow_hash: "",
				edit_hash: "",
				context: vkPlaylist.type || "",
				covers: [],
				author: playlistResponse.profiles?.[0] ? {
					id: playlistResponse.profiles[0].id,
					name: `${playlistResponse.profiles[0].first_name || ""} ${playlistResponse.profiles[0].last_name || ""}`.trim()
				} : undefined,
				list: []
			};

			// Если нужен список треков
			if (params.list !== false && playlist.size > 0) {
				const playlistAccessKey = vkPlaylist.access_key || params.access_hash || "";
				const entity_id = `${vkPlaylist.owner_id}_${vkPlaylist.id}_${playlistAccessKey}`;

				const audioIds = await this.getIdsBySource({
					source: "playlist",
					entity_id
				}).catch(() => []);

				if (audioIds.length > 0) {
					// Получаем полную информацию о треках через reloadAudios
					const { getAudioRequestsInstance } = await import("~~/server/api/vk/audio/audio");
					const audioRequests = getAudioRequestsInstance(this.event);

					// Применяем offset и count если указаны
					let processedIds = audioIds;
					if (params.offset) {
						processedIds = processedIds.slice(params.offset);
					}
					if (params.count) {
						processedIds = processedIds.slice(0, params.count);
					}

					// Получаем полную информацию о треках
					// audio_id из getIdsBySource уже в правильном формате для reloadAudios
					const audioIdsList = processedIds.map(item => item.audio_id);
					
					if (audioIdsList.length > 0) {
						const rawAudios = await audioRequests.getById({ ids: audioIdsList.join(",") });

						// Парсим треки
						playlist.list = await audioRequests.parseAudios(rawAudios, {
							count: params.count
						});
					}
				}
			}

			return playlist;
		}

		// Fallback на старый метод если новый API не сработал
		return await this.getById(params);
	}

	public async getById(params: {
		owner_id?: number;
		playlist_id: number;
		access_hash?: string;
		list?: boolean;
		count?: number;
		offset?: number;
	}): Promise<TPlaylist> {
		if (!params.playlist_id) {
			throw createError({
				statusCode: 400,
				message: "You must to specify playlist_id"
			});
		}

		const owner_id = params.owner_id || this.event.context.user.id;

		const requestForm = {
			access_hash: params.access_hash || "",
			act: "load_section",
			al: 1,
			claim: 0,
			context: "",
			from_id: this.event.context.user.id,
			is_loading_all: 1,
			is_preload: 0,
			offset: 0,
			owner_id,
			playlist_id: params.playlist_id,
			type: "playlist"
		};

		const response = await this.request<TRawResponse<any>>(requestForm);

		if (!response) {
			return this.getPlaylistInfo({
				accessHash: params.access_hash || "",
				ownerId: owner_id,
				id: params.playlist_id,
				title: "",
				cover_url: "",
				followed: true,
				size: 0,
				restricted: true,
				permissions: {
					follow: false,
					unfollow: true
				}
			});
		}

		if (typeof response === "string") {
			return this.getPlaylistInfo({
				accessHash: params.access_hash || "",
				ownerId: owner_id,
				id: params.playlist_id,
				title: "",
				cover_url: "",
				followed: true,
				size: 0,
				restricted: true,
				permissions: {
					follow: false,
					unfollow: true
				}
			});
		}

		if (!response.payload) {
			return this.getPlaylistInfo({
				accessHash: params.access_hash || "",
				ownerId: owner_id,
				id: params.playlist_id,
				title: "",
				cover_url: "",
				followed: true,
				size: 0,
				restricted: true,
				permissions: {
					follow: false,
					unfollow: true
				}
			});
		}

		const responsePayload = response.payload[1];
		const responsePayload0 = response.payload[0];

		// Check if VK returned [0, []] - this means playlist is not accessible
		// But don't throw error here - return empty playlist with restricted flag
		// The frontend should handle this case
		if (responsePayload0 === 0 && Array.isArray(responsePayload) && responsePayload.length === 0) {
			return this.getPlaylistInfo({
				accessHash: params.access_hash || "",
				ownerId: owner_id,
				id: params.playlist_id,
				title: "",
				cover_url: "",
				followed: true,
				size: 0,
				restricted: true,
				permissions: {
					follow: false,
					unfollow: true
				}
			});
		}

		if (!responsePayload) {
			return this.getPlaylistInfo({
				accessHash: params.access_hash || "",
				ownerId: owner_id,
				id: params.playlist_id,
				title: "",
				cover_url: "",
				followed: true,
				size: 0,
				restricted: true,
				permissions: {
					follow: false,
					unfollow: true
				}
			});
		}

		let payload: any = null;

		if (Array.isArray(responsePayload)) {
			payload = responsePayload[0];
		} else if (responsePayload && typeof responsePayload === "object") {
			if (Array.isArray(responsePayload.playlist)) {
				payload = responsePayload.playlist[0];
			} else if (responsePayload.playlist) {
				payload = responsePayload.playlist;
			} else if (responsePayload[0]) {
				payload = responsePayload[0];
			}
		}

		if (!payload) {
			return this.getPlaylistInfo({
				accessHash: params.access_hash || "",
				ownerId: owner_id,
				id: params.playlist_id,
				title: "",
				cover_url: "",
				followed: true,
				size: 0,
				restricted: true,
				permissions: {
					follow: false,
					unfollow: true
				}
			});
		}

		const playlist = this.getPlaylistInfo(payload);

		if (params.list) {
			if (!payload.list) {
				playlist.list = [];
			} else {
				const count = params.count || 50;
				const offset = params.offset || 0;
				const needSplice = offset > 0 || payload.list.length > count;
				const list = needSplice ? payload.list.slice(offset, offset + count) : payload.list;

				playlist.list = await getAudioRequestsInstance(this.event).parseAudios(list, {
					count: params.count
				});
			}
		}

		return playlist;
	}

	public buildCollections(html: string | string[]): TPlaylistCollection[] {
		const htmlString = typeof html === "string" ? html : html[0] || "";
		const root = HTMLParser.parse(htmlString);

		const blocks = root.querySelectorAll(".CatalogBlock:not(.CatalogBlock--separator)").filter(block => {
			return block.querySelector("._audio_page__playlists");
		});

		return blocks.map(block => this.buildCollection(block));
	}

	protected buildCollection(block: any): TPlaylistCollection {
		const playlistsBlock = block.querySelector("._audio_page__playlists");
		const header = block.querySelector(".CatalogBlock__title")?.parentNode || block.previousSibling;

		const type = playlistsBlock?.attributes["data-type"] || "recommendations";
		const title = header?.querySelector(".CatalogBlock__title")?.text || "";

		const linkBlock = header?.querySelector(".audio_page_block__show_all_link");
		let link: string | undefined;
		let params: URLSearchParams | undefined;

		if (linkBlock) {
			link = linkBlock.attributes.href;
			const queryString = link?.replace(/(.*?)\?/, "");
			if (queryString) {
				params = new URLSearchParams(queryString);
			}
		}

		const playlistsHTML = playlistsBlock?.innerHTML || "";
		const playlists = this.builder({
			payload: { 1: [{ 0: playlistsHTML }] }
		} as any);

		return {
			type,
			title: this.unescape(title),
			playlists: playlists as unknown as TPlaylist[],
			link,
			params
		};
	}

	public async create(params: {
		title: string;
		description: string;
		cover?: string;
	}): Promise<TPlaylist> {
		if (!params.title) {
			throw createError({
				statusCode: 400,
				message: "title is required"
			});
		}

		const hash = await this.getNewHash();

		const response = await this.request({
			Audios: "",
			act: "save_playlist",
			al: 1,
			cover: params.cover ? await this.uploadCover(params.cover) : "",
			description: params.description || "",
			hash,
			owner_id: this.event.context.user.id,
			playlist_id: 0,
			title: params.title,
			isPlaylist: true
		} as any);

		return this.getPlaylistInfo((response as TRawResponse<any>).payload[1][0]);
	}

	public async edit(params: {
		playlist_id: number;
		title?: string;
		description?: string;
		cover?: string;
		no_discover?: boolean;
	}): Promise<any> {
		if (!params.playlist_id) {
			throw createError({
				statusCode: 400,
				message: "playlist_id is required"
			});
		}

		const playlist = await this.getPlaylist({
			playlist_id: params.playlist_id,
			list: true
		});

		if (!playlist.edit_hash) {
			throw createError({
				statusCode: 403,
				message: "Can't fetch edit_hash of playlist due internal VK error"
			});
		}

		const Audios = playlist.list?.map(audio => audio.full_id).join(",") || "";

		return await this.request({
			act: "save_playlist",
			Audios,
			al: 1,
			cover: params.cover ? await this.uploadCover(params.cover) : 0,
			description: params.description ?? playlist.description,
			hash: playlist.edit_hash,
			no_discover: params.no_discover ? 1 : 0,
			owner_id: playlist.owner_id || this.event.context.user.id,
			playlist_id: params.playlist_id
		} as any);
	}

	public async delete(playlist: TPlaylist): Promise<boolean> {
		if (!playlist.edit_hash) {
			throw createError({
				statusCode: 403,
				message: "Access denied"
			});
		}

		await this.request({
			act: "delete_playlist",
			al: 1,
			hash: playlist.edit_hash,
			page_owner_id: playlist.owner_id || this.event.context.user.id,
			playlist_id: playlist.playlist_id,
			playlist_owner_id: playlist.owner_id || this.event.context.user.id
		} as any);

		return true;
	}

	public async follow(playlist: TPlaylist): Promise<any> {
		if (!playlist.follow_hash) {
			throw createError({
				statusCode: 403,
				message: "Access Denied"
			});
		}

		return await this.request({
			act: "follow_playlist",
			al: 1,
			hash: playlist.follow_hash,
			playlist_id: playlist.playlist_id,
			playlist_owner_id: playlist.owner_id
		} as any);
	}

	public async reorder(params: {
		playlist_id: number;
		prev_playlist_id: number;
	}): Promise<boolean> {
		const hash = await this.getReorderHash();

		await this.request({
			act: "reorder_playlist",
			al: 1,
			hash,
			owner_id: this.event.context.user.id,
			playlist_id: params.playlist_id,
			prev_playlist_id: params.prev_playlist_id
		} as any);

		return true;
	}

	public async addSong(audio: any, playlist: TPlaylist): Promise<any> {
		if (!audio || !playlist) {
			throw createError({
				statusCode: 400,
				message: "You must to specify audio and playlist"
			});
		}

		const hash = await this.getSaveHash(audio);

		return await this.request({
			act: "save_audio_in_playlists",
			add_pl_ids: playlist.playlist_id,
			al: 1,
			audio_id: audio.id,
			audio_owner_id: audio.owner_id,
			hash,
			owner_id: this.event.context.user.id,
			remove_pl_ids: ""
		} as any);
	}

	public async removeSong(audio: any, playlist: TPlaylist): Promise<any> {
		if (!audio || !playlist) {
			throw createError({
				statusCode: 400,
				message: "You must to specify audio and playlist"
			});
		}

		const hash = await this.getSaveHash(audio);

		return await this.request({
			act: "save_audio_in_playlists",
			add_pl_ids: "",
			al: 1,
			audio_id: audio.id,
			audio_owner_id: audio.owner_id,
			hash,
			owner_id: this.event.context.user.id,
			remove_pl_ids: playlist.playlist_id
		} as any);
	}

	public async reorderSongs(params: {
		playlist_id: number;
		Audios?: string;
		force?: boolean;
	}): Promise<any> {
		if (!params.playlist_id) {
			throw createError({
				statusCode: 400,
				message: "You must to specify playlist_id"
			});
		}

		const playlist = await this.getPlaylist({ playlist_id: params.playlist_id });

		if (!params.Audios && playlist.size > 0 && !params.force) {
			throw createError({
				statusCode: 400,
				message: "I'm not really sure you want to leave the playlist empty. But if you do, specify in params force: true"
			});
		}

		return await this.request({
			Audios: params.Audios || "",
			act: "save_playlist",
			al: 1,
			cover: 0,
			description: playlist.description,
			hash: playlist.edit_hash,
			owner_id: this.event.context.user.id,
			playlist_id: params.playlist_id,
			title: playlist.title
		} as any);
	}

	protected async getNewHash(): Promise<string> {
		const response = await this.mainPage();
		const newPlaylistHashMatch = response.match(/"newPlaylistHash":"(.*?)"/);
		
		if (!newPlaylistHashMatch) {
			return "";
		}

		return newPlaylistHashMatch[1].replace(/"/g, "");
	}

	protected async getSaveHash(audio: any): Promise<string> {
		const response = await this.request({
			act: "more_playlists_add",
			al: 1,
			audio_id: audio.id,
			audio_owner_id: audio.owner_id,
			owner_id: this.event.context.user.id
		} as any);

		const hashMatch = (response as TRawResponse<any>).payload[1][2].match(/], '(.*)'/);
		return hashMatch ? hashMatch[1] : "";
	}

	protected async getReorderHash(): Promise<string> {
		const response = await this.mainPage();
		const reorderHashMatch = response.match(/"reorderHash":"(.*?)"/);

		if (!reorderHashMatch) {
			return "";
		}

		return reorderHashMatch[1].replace(/"/g, "");
	}

	protected async mainPage(): Promise<string> {
		return await this.request<string>({});
	}

	protected async uploadCover(coverFile: string): Promise<string> {
		const url = await this.getUploadCoverURL();
		// TODO: Implement file upload
		return "";
	}

	protected async getUploadCoverURL(): Promise<string> {
		const response = await this.mainPage();
		const urlMatch = response.match(/\"url\":\"(.*?)\"/);
		
		if (!urlMatch) {
			throw createError({
				statusCode: 500,
				message: "Could not find upload URL"
			});
		}

		const hashMatch = response.match(/"hash":"(.*?)"/);
		if (!hashMatch) {
			throw createError({
				statusCode: 500,
				message: "Could not find hash"
			});
		}

		const hash = hashMatch[1].replace(/"/g, "");

		const query = new URLSearchParams({
			act: "audio_playlist_cover",
			ajx: "1",
			hash,
			mid: String(this.event.context.user.id),
			upldr: "1"
		}).toString();

		return `${urlMatch[1]}?${query}`;
	}
}

export const getPlaylistsRequestsInstance = (event: H3Event<EventHandlerRequest>): PlaylistsRequests => {
	return new PlaylistsRequests(event);
};
