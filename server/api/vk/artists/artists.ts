import HTMLParser from "node-html-parser";

import { BaseRequest } from "~~/server/utils/base";
import { getAudioRequestsInstance } from "~~/server/api/vk/audio/audio";
import { IRequest, TRawResponse, TGetSectionPayload, TGetCatalogSectionPayload } from "~~/server/utils/types";

import type { EventHandlerRequest, H3Event } from "h3";

import type { TArtist, TMore, TPlaylistCollection } from "~~/server/utils/types";

class ArtistsRequests extends BaseRequest implements IRequest {
	constructor(event: H3Event<EventHandlerRequest>) {
		super(event);
	}

	public async get(artist: string, params: { list?: boolean } = {}): Promise<any> {
		const isId = /^-\d+_\d+$/.test(artist) || /^-?\d+$/.test(artist);
		const artistPath = isId ? artist : artist.toLowerCase();
		
		let data: TRawResponse<TGetCatalogSectionPayload> | null = null;
		let pageHtml: string | null = null;

		data = await this.loadCatalogSectionFromPage(`/artist/${artistPath}`).catch((error: Error) => {
			console.error("Failed to load catalog section for artist:", artist, error);
			return null;
		});

		let html = "";

		if (data && data.payload && data.payload[1] && data.payload[1][0]) {
			const htmlRaw = data.payload[1][0];
			html = Array.isArray(htmlRaw) 
				? htmlRaw.join("") 
				: String(htmlRaw);
		}

		if (!html || html.trim() === "") {
			pageHtml = await this.request<string>({}, `/artist/${artistPath}`).catch((error: Error) => {
				console.error("Failed to load artist page directly:", artist, error);
				return null;
			});

			if (pageHtml) {
				const pageRoot = HTMLParser.parse(pageHtml);
				const artistBlock = pageRoot.querySelector(".MusicAuthor_block");
				
				if (artistBlock) {
					html = artistBlock.outerHTML;
				} else {
					const catalogBlock = pageRoot.querySelector(".CatalogBlock");
					if (catalogBlock) {
						html = catalogBlock.innerHTML;
					}
				}
			}
		}

		if (!html || html.trim() === "") {
			throw createError({
				statusCode: 404,
				message: "Artist not found"
			});
		}

		const root = HTMLParser.parse(html);
		const block = root.querySelector(".MusicAuthor_block");

		if (!block) {
			throw createError({
				statusCode: 404,
				message: "Artist not found"
			});
		}

		const followBlock = root.querySelector(".MusicAuthor__follow_btn");
		let followInfo = null;

		if (followBlock && followBlock.attributes.onclick) {
			const match = followBlock.attributes.onclick.match(/AudioUtils\.(.*?)\((.*?)\)/);

			if (match) {
				const followMeta = this.cleanValue(match[2]).split(",");

				followInfo = {
					followed: match[1] === "unfollowArtist",
					id: followMeta[0]?.trim() || "",
					type: followMeta[1]?.trim() || "",
					hash: followMeta[2]?.trim() || ""
				};
			}
		}

		const playlistsRequests = await import("../playlists/playlists").then(m => m.getPlaylistsRequestsInstance(this.event));

		const result: any = {
			name: block.querySelector(".MusicAuthor_block__title")?.text || "",
			cover: {
				src: this.getCover(block, ".MusicAuthor_block__cover"),
				blur: block.querySelector(".MusicAuthor_block__cover")?.classList.contains("blur") || false
			},
			artists: data ? await this.builder(data) : [],
			collections: data && data.payload && data.payload[1] && data.payload[1][0]
				? playlistsRequests.buildCollections(data.payload[1][0])
				: [],
			follow: followInfo || {
				followed: false,
				id: "",
				type: "",
				hash: ""
			}
		};

		if (params.list) {
			if (data) {
				const audioRequests = getAudioRequestsInstance(this.event);
				result.audios = await audioRequests.builder(data);
			} else {
				result.audios = [];
			}
		}

		return result;
	}

	public async builder<T, K>(response: TRawResponse<T>): Promise<K[]> {
		if (typeof response === "object" && response.payload) {
			const html = (response.payload as any)[1][0]?.join("") || "";
			return this.builderHTML(html) as K[];
		}

		if (typeof response === "string") {
			return this.builderHTML(response) as K[];
		}

		return [] as K[];
	}

	protected builderHTML(html: string): TArtist[] {
		const parsed = HTMLParser.parse(html);
		const items = parsed.querySelectorAll(".audio_block_small_item--artist");

		return items.map(item => {
			const titleBlock = item.querySelector(".audio_block_small_item__title");
			const coverBlock = item.querySelector(".audio_block_small_item__img");
			const linkBlock = item.querySelector(".title_link");

			const coverStyle = coverBlock?.attributes.style || "";
			const coverMatch = coverStyle.match(/background-image:\s?url\('?(.*?)'?\)/);
			const linkMatch = linkBlock?.attributes.href.match(/\/artist\/(.*?)\?/);

			return {
				id: linkMatch?.[1] || "",
				name: this.unescape(titleBlock?.text || ""),
				cover: coverMatch?.[1] || "",
				link: linkMatch?.[1] || ""
			};
		});
	}

	protected payload(response: any): any {
		const payload = response.payload[1][0];

		if (payload.artists) {
			payload.artists = payload.artists.map((artist: any) => ({
				...artist,
				name: this.unescape(artist.name)
			}));
		}

		return {
			...payload,
			more: this.parseMore(payload)
		};
	}


	public async collections(link: string): Promise<TPlaylistCollection[]> {
		const data = await this.loadCatalogSectionFromPage(link);
		const playlistsRequests = await import("../playlists/playlists").then(m => m.getPlaylistsRequestsInstance(this.event));
		return playlistsRequests.buildCollections(data.payload[1][0]);
	}

	public async related(artist_id: string, params: { count?: number } = {}): Promise<TArtist[]> {
		if (!artist_id) {
			return [];
		}

		const response = await this.request({
			act: "get_related_artists",
			al: 1,
			artist_id: String(artist_id),
			count: Number(params.count) || 10
		} as any);

		const payload = this.payload(response);
		return payload?.artists || [];
	}

	public async similar(artist: string): Promise<TArtist[]> {
		const data = await this.loadCatalogSectionFromPage(`/artist/${artist.toLowerCase()}/related`);
		return await this.builder(data);
	}

	public async follow(follow: {
		id: string;
		hash: string;
	}): Promise<any> {
		const response = await this.request({
			act: "follow",
			al: 1,
			artist_id: follow.id,
			hash: follow.hash,
			ref: "artist"
		} as any, "al_artist.php");

		return (response as TRawResponse<any>).payload[1][0];
	}

	public async unfollow(follow: {
		id: string;
		hash: string;
	}): Promise<any> {
		const response = await this.request({
			act: "unfollow",
			al: 1,
			artist_id: follow.id,
			hash: follow.hash,
			ref: "artist"
		} as any, "al_artist.php");

		return (response as TRawResponse<any>).payload[1][0];
	}

	public async search(query: string, params: { more?: TMore } = {}): Promise<{
		artists: TArtist[];
		next?: () => Promise<any>;
	}> {
		if (!query) {
			throw createError({
				statusCode: 400,
				message: "You must to specify query"
			});
		}

		const response = await this.request({
			act: "search_artists",
			al: 1,
			query,
			start_from: params.more?.next_from || ""
		} as any);

		const payload = this.payload(response);

		return {
			artists: payload?.artists || [],
			next: payload?.more ? () => this.search(query, { more: payload.more }) : undefined
		};
	}
}

export const getArtistsRequestsInstance = (event: H3Event<EventHandlerRequest>): ArtistsRequests => {
	return new ArtistsRequests(event);
};
