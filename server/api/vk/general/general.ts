import HTMLParser, { HTMLElement } from "node-html-parser";

import { BaseRequest } from "~~/server/utils/base";
import { getSearchRequestsInstance } from "../search/search";
import { getPlaylistsRequestsInstance } from "../playlists/playlists";

import type { EventHandlerRequest, H3Event } from "h3";
import type { TPlaylistCollection, TMore } from "~~/server/utils/types";
import { IRequest, TRawResponse, TGetSectionPayload } from "~~/server/utils/types";

class GeneralRequests extends BaseRequest implements IRequest {
	constructor(event: H3Event<EventHandlerRequest>) {
		super(event);
	}

	public async builder<T, K>(response: TRawResponse<T>): Promise<K[]> {
		return [] as K[];
	}

	public async load(params: { raw?: boolean } = {}): Promise<TPlaylistCollection[]> {
		const page = await this.getRawGeneralPage();

		if (!page) {
			return [];
		}

		const pagePayload = page as TRawResponse<TGetSectionPayload>;
		const sectionPayload = pagePayload.payload?.[1];
		const html = (sectionPayload?.[0] as string) || "";

		const recommended = await this.getRecommended(html, params);
		const vibe = await this.getVibe(html);
		const collections = this.buildCollections(sectionPayload ? [sectionPayload[0], sectionPayload[1]] as [string, unknown] : null);

		return [
			recommended,
			vibe,
			...collections
		];
	}

	public async getRawGeneralPage(): Promise<TRawResponse<TGetSectionPayload> | null> {
		return await this.getSection<TGetSectionPayload>({
			section: "general",
			owner_id: this.event.context.user.id
		});
	}

	public async getRecommended(page: string, params: { raw?: boolean } = {}): Promise<TPlaylistCollection> {
		const users_playlists: TPlaylistCollection = {
			type: "users_playlists",
			title: "",
			playlists: []
		};

		if (!page || typeof page !== "string") {
			return users_playlists;
		}

		const parsed = HTMLParser.parse(page);
		const block = parsed.querySelector(".CatalogBlock__recommended_playlists_extended_header")?.parentNode;

		const result = await this.buildRecommendedBlock(block, users_playlists, params);

		return result;
	}

	public async getVibe(page: string): Promise<TPlaylistCollection> {
		if (!page || typeof page !== "string") {
			return {
				type: "vibes",
				title: "",
				playlists: []
			};
		}

		const parsed = HTMLParser.parse(page);
		const block = parsed.querySelector(".CatalogBlock__recoms_vibe_carousel");

		if (!block) {
			return {
				type: "vibes",
				title: "",
				playlists: []
			};
		}

		const header = parsed.querySelector(".CatalogRecomsVibeCarouselHeader");

		const playlists = block.querySelectorAll(".ui_gallery_item").map(item => {
			const playlist = item.querySelector("._audio_pl");
			if (!playlist) {
				return null;
			}

			const meta = playlist.attributes.onclick?.match(/playPlaylist\(([^)]+)\)/);
			if (!meta) {
				return null;
			}

			const [owner_id, playlist_id, access_hash, catalog] = meta[1].split(",");

			return {
				owner_id: Number(owner_id),
				playlist_id: Number(playlist_id),
				access_hash: this.cleanValue(access_hash),
				catalog: this.cleanValue(catalog),
				title: item.querySelector(".VibeRecomsPlaylist__title")?.text || "",
				cover_url: this.getCover(item, ".VibeRecomsPlaylist__cover"),
				size: -1
			};
		}).filter(Boolean) as any[];

		return {
			type: "vibes",
			title: this.unescape(header?.text || ""),
			playlists
		};
	}

	public async buildRecommendedBlock(block: any, reference: TPlaylistCollection, params: { raw?: boolean } = {}): Promise<TPlaylistCollection> {
		if (!block) {
			return reference;
		}

		const titleBlock = block.querySelector(".CatalogBlock__title");
		const title = titleBlock?.text || "";

		const items = block.querySelectorAll(".RecommendedPlaylist");

		const playlistsRequests = getPlaylistsRequestsInstance(this.event);
		const audioRequests = await import("../audio/audio").then(m => m.getAudioRequestsInstance(this.event));

		const playlists = await Promise.all(items.map(async (item: HTMLElement, index: number) => {
			const top = item.querySelector(".RecommendedPlaylist__top");
			const matchValue = item.querySelector(".RecommendedPlaylist__matchValue")?.textContent || "0";
			const audiosBlock = item.querySelector(".RecommendedPlaylist__audios");

			let audios: any[] = [];
			if (audiosBlock) {
				const audiosHTML = audiosBlock.innerHTML;
				const regex = /data-audio=\"(.*?)\" (on|data)/g;
				const matches = Array.from(audiosHTML.matchAll(regex));

				audios = matches.map((match) => {
					const object = match[1];
					const unescaped = this.unescape(object as string);
					return JSON.parse(unescaped);
				});

				if (!params.raw) {
					audios = await audioRequests.parseAudios(audios);
				}
			}

			const infoMatch = item.innerHTML.match(/showAudioPlaylist\((.*?)\)/);
			if (!infoMatch) {
				return null;
			}

			const match = infoMatch[1].split(", ");
			const owner_id = Number(match[0]);
			const playlist_id = Number(match[1]);
			const access_hash = this.cleanValue(match[2]);

			const followMatch = item.innerHTML.match(/followPlaylist\((.*?)\)/);
			let followInfo = null;
			if (followMatch) {
				const followMatchData = followMatch[1].split(", ");
				followInfo = {
					owner_id: Number(followMatchData[1]),
					playlist_id: Number(followMatchData[2]),
					follow_hash: this.cleanValue(followMatchData[3]),
					followed: item.classList.contains("audio_pl__followed") || item.innerHTML.includes("audio_pl__followed")
				};
			}

			const ownerBlock = item.querySelector(".RecommendedPlaylist__ownerName");
			const ownerAvatar = item.querySelector(".RecommendedPlaylist__ownerImage");

			const playlistInfo = playlistsRequests.getPlaylistInfo({
				ownerId: owner_id,
				id: playlist_id,
				accessHash: access_hash,
				title: item.querySelector(".RecommendedPlaylist__title")?.textContent || "",
				followHash: followInfo?.follow_hash || "",
				isFollowed: followInfo?.followed || false
			});

			const background = this.getStyle(top, /background-image:\s?url\(['"]?([^'")]+)['"]?\)/);

			const backdrop = item.querySelector(".RecommendedPlaylist__backdrop");
			const backdropBackground = backdrop ? this.getStyle(backdrop, /background-image:\s?url\(['"]?([^'")]+)['"]?\)/) : "";

			const finalBackground = background || backdropBackground || playlistInfo.cover_url || (playlistInfo.covers && playlistInfo.covers.length > 0 ? playlistInfo.covers[0] : "");

			return {
				...playlistInfo,
				background: finalBackground,
				match: {
					value: parseInt(matchValue),
					text: item.querySelector(".RecommendedPlaylist__matchText")?.textContent || ""
				},
				owner: ownerBlock ? {
					name: ownerBlock.textContent || "",
					avatar: this.fixAvatar(ownerAvatar?.attributes.style?.match(/background-image:url\('(.*)\'/)?.[1] || "")
				} : null,
				audios
			};
		}));

		const filteredPlaylists = playlists.filter(Boolean);

		return {
			...reference,
			title: this.unescape(title),
			playlists: filteredPlaylists
		};
	}

	public buildCollections(page: [string, unknown] | null): TPlaylistCollection[] {
		if (!page || !page[0]) {
			return [];
		}

		const html = typeof page[0] === "string" ? page[0] : Array.isArray(page[0]) ? (page[0] as string[]).join("") : "";
		
		if (!html) {
			return [];
		}

		const root = HTMLParser.parse(html);

		const blocks = root.querySelectorAll(".CatalogBlock").filter(block => {
			return block.querySelector(".CatalogBlock__content[data-type]");
		});

		return blocks.map(block => this.buildCollection(block));
	}

	public buildCollection(block: any): TPlaylistCollection {
		const playlistsBlock = block.querySelector(".CatalogBlock__content");
		const header = block.querySelector(".CatalogBlock__title")?.parentNode || block.previousSibling;

		const type = playlistsBlock?.attributes["data-type"] || "recommendations";
		const title = header?.querySelector(".CatalogBlock__title")?.text || "";

		const linkBlock = header?.querySelector("a");
		let link: string | undefined;
		let params: URLSearchParams | undefined;

		if (linkBlock) {
			link = linkBlock.attributes.href;
			const queryString = link?.replace(/(.*?)\?/, "");
			if (queryString) {
				params = new URLSearchParams(queryString);
			}
		}

		const playlistsRequests = getPlaylistsRequestsInstance(this.event);
		const playlistsHTML = playlistsBlock?.innerHTML || "";

		const playlists = playlistsRequests.builder({
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

	public getStyle(element: any, regex: RegExp): string {
		if (!element) {
			return "";
		}

		const style = element.attributes.style || "";
		
		// Try multiple regex patterns to handle different URL formats
		const patterns = [
			/background-image:\s*url\(['"]?([^'")]+)['"]?\)/,
			/background-image:\s*url\(['"]?([^'")]+)/,
			/background-image:\s*url\(['"]([^'"]+)/,
			/background-image:\s*url\(([^)]+)\)/
		];
		
		for (const pattern of patterns) {
			const match = style.match(pattern);
			if (match && match[1]) {
				return match[1].replace("&amp;", "&").trim();
			}
		}
		
		return "";
	}

	public fixAvatar(url: string): string {
		if (!url) {
			return "";
		}

		return url.replace("&amp;", "&");
	}

	public async usersPlaylists(): Promise<any[]> {
		const searchRequests = getSearchRequestsInstance(this.event);
		const html = await this.getDataByBlock(searchRequests as any, {
			block: "playlists_ugc",
			section: "general",
			page: true
		});

		const playlistsRequests = getPlaylistsRequestsInstance(this.event);
		return playlistsRequests.builder({
			payload: { 1: [{ 0: html }] }
		} as any);
	}
}

export const getGeneralRequestsInstance = (event: H3Event<EventHandlerRequest>): GeneralRequests => {
	return new GeneralRequests(event);
};

