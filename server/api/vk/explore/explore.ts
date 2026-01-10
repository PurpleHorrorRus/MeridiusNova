import HTMLParser, { HTMLElement } from "node-html-parser";
import type { EventHandlerRequest, H3Event } from "h3";

import { BaseRequest } from "~~/server/utils/base";
import { getAudioRequestsInstance } from "../audio/audio";
import { getPlaylistsRequestsInstance } from "../playlists/playlists";

import { IRequest, TRawResponse, TGetSectionPayload } from "~~/server/utils/types";
import type { TExploreData, TMore, TPlaylistCollection, TExploreSection, TAlbumRawItem, TAudio, TRadio, TVkMixResponse } from "~~/server/utils/types";

class ExploreRequests extends BaseRequest implements IRequest {
	constructor(event: H3Event<EventHandlerRequest>) {
		super(event);
	}

	public async builder<T, K>(_response: TRawResponse<T>): Promise<K[]> {
		return [] as K[];
	}

	public async load(params: { count?: number } = {}): Promise<TExploreData> {
		const section = await this.getRawExplorePage();

		if (!section) {
			return {
				albums: [],
				artists: [],
				releases: [],
				chart: [],
				playlists: []
			};
		}

		const [albums, artists, releases, chart, playlists] = await Promise.all([
			this.newAlbums(section),
			this.newArtists(params),
			this.newReleases(params),
			this.chart(params),
			this.officialPlaylists(section)
		]);

		return {
			albums,
			artists,
			releases,
			chart,
			playlists
		};
	}

	protected async newAlbums(section: TExploreSection | null): Promise<TAlbum[]> {
		if (!section || !section[0]) {
			return [];
		}

		const [html] = section;
		
		if (!html || typeof html !== "string") {
			return [];
		}

		const root = HTMLParser.parse(html);

		const audioItems = root.querySelectorAll(".CatalogBlock__bannerItems .ui_gallery_item");
		return audioItems.map(item => this.buildAlbum(item)).filter((item): item is NonNullable<typeof item> => item !== null) as TAlbum[];
	}

	protected buildAlbum(item: HTMLElement): TAlbum | null {
		const title = item.querySelector(".BannerItem__title")?.textContent || "";
		const text = item.querySelector(".BannerItem__text")?.textContent || "";
		const subtext = item.querySelector(".BannerItem__subtext")?.textContent || "";
		const image = this.getCover(item);

		const link = item.querySelector(".BannerItem__link")?.getAttribute("href") || "";

		const albumRegex = /(album|playlist)\/(.*)/;
		const artistRegex = /artist\/(.*)/;

		if (albumRegex.test(link)) {
			const match = link.match(albumRegex);
			if (!match) {
				return null;
			}

			const [owner_id, playlist_id, access_hash] = match[2].split("_");

			return {
				title: this.cleanValue(title),
				text: this.cleanValue(text),
				subtext,
				image,
				type: "album",
				owner_id: Number(owner_id),
				playlist_id: Number(playlist_id),
				access_hash,
				size: -1
			};
		} else if (artistRegex.test(link)) {
			const match = link.match(artistRegex);
			if (!match) {
				return null;
			}

			return {
				title: this.unescape(title),
				text: this.unescape(text),
				subtext,
				image,
				type: "artist",
				artist: match[1]
			};
		}

		return null;
	}

	protected async newArtists(params: { count?: number } = {}): Promise<TAudio[]> {
		const audioRequests = getAudioRequestsInstance(this.event);

		const { list } = await this.getDataByBlock(audioRequests, {
			block: "new_artist",
			section: "explore",
			...params
		});

		return list;
	}

	protected async newReleases(params: { count?: number } = {}): Promise<TAudio[]> {
		const audioRequests = getAudioRequestsInstance(this.event);
		const { list } = await this.getDataByBlock(audioRequests, {
			block: "new_songs",
			section: "explore",
			...params
		});

		return list;
	}

	protected async chart(params: { count?: number } = {}): Promise<TAudio[]> {
		const audioRequests = getAudioRequestsInstance(this.event);
		const { list } = await this.getDataByBlock(audioRequests, {
			block: "tracks_chart",
			section: "explore",
			...params
		});

		return list;
	}

	protected async officialPlaylists(section: TExploreSection | null): Promise<TPlaylistCollection[]> {
		if (!section || !section[1]) {
			return [];
		}

		const payload = section[1];

		const playlistsRequests = getPlaylistsRequestsInstance(this.event);
		let data = await this.requestMore({
			section_id: payload.sectionId,
			start_from: payload.next_from || payload.nextFrom
		}, { page: true });

		if (!((data as TRawResponse<TGetSectionPayload>).payload[1][0] as string | string[])) {
			return await this.officialPlaylists(section);
		}

		let playlists: TPlaylistCollection[] = [];
		let more: TMore | null = null;

		const htmlData = (data as TRawResponse<TGetSectionPayload>).payload[1][0];
		const html = Array.isArray(htmlData) 
			? htmlData.join("") 
			: typeof htmlData === "string" 
				? htmlData 
				: "";
		
		if (html) {
			playlists = playlistsRequests.buildCollections(html);
		}

		more = this.parseMore((data as TRawResponse<TGetSectionPayload>).payload[1][1]);

		while (more && this.validateMore(more)) {
			data = await this.requestMore(more, { page: true });
			const nextHtmlData = (data as TRawResponse<TGetSectionPayload>).payload[1][0];

			const nextHtml = Array.isArray(nextHtmlData) 
				? nextHtmlData.join("") 
				: typeof nextHtmlData === "string" 
					? nextHtmlData 
					: "";
			
			if (nextHtml) {
				const nextPlaylists = playlistsRequests.buildCollections(nextHtml);
				playlists = [...playlists, ...nextPlaylists];
			}

			more = this.parseMore((data as TRawResponse<TGetSectionPayload>).payload[1][1]);
		}

		return playlists;
	}

	protected async getRawExplorePage(): Promise<TExploreSection | null> {
		const response = await this.getSection<TGetSectionPayload>({
			section: "explore",
			owner_id: this.event.context.user.id
		}).catch(() => null);

		if (!response?.payload?.[1]) {
			return null;
		}

		return response.payload[1] as unknown as TExploreSection;
	}

	public async vkMix(sectionId: string | null = null): Promise<TVkMixResponse> {
		if (!sectionId) {
			const section = await this.getRawExplorePage();
			sectionId = section?.[1]?.sectionId || section?.[1]?.section_id || "";

			if (!sectionId) {
				throw new Error("Failed to get sectionId");
			}
		}

		const audioRequests = getAudioRequestsInstance(this.event);
		
		const [vkSong] = await this.callVKAPI("audio.getStreamMixAudios", {}, {
			mix_id: "common",
			ref: sectionId,
			count: 1
		}, "POST");

		if (!vkSong) {
			throw new Error("Failed to get VK Mix song");
		}

		const songs = await audioRequests.getById({
			ids: `${vkSong.owner_id}_${vkSong.id}_${vkSong.access_key || ""}`
		});

		if (!songs || songs.length === 0) {
			throw new Error("Failed to get song from reload_audios");
		}

		const normalized = await audioRequests.parseAudios(songs, { raw: true });

		return {
			song: normalized[0],
			sectionId
		};
	}
}

export const getExploreRequestsInstance = (event: H3Event<EventHandlerRequest>): ExploreRequests => {
	return new ExploreRequests(event);
};