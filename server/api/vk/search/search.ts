import HTMLParser from "node-html-parser";

import { BaseRequest } from "~~/server/utils/base";
import { getAudioRequestsInstance } from "~~/server/api/vk/audio/audio";
import { getPlaylistsRequestsInstance } from "../playlists/playlists";
import { IRequest, TPayload, TRawResponse, TGetSectionPayload, TGetCatalogSectionPayload } from "~~/server/utils/types";

import type { EventHandlerRequest, H3Event } from "h3";

import type { TGetSectionParams } from "~~/server/utils/base";
import type { TSearchResult, TMore, THintsPayload, TPlaylist, TSearchCategory } from "~~/server/utils/types";
import type { TRawAudio, TAudio } from "~~/server/api/vk/audio/types";

class SearchRequests extends BaseRequest implements IRequest {
	constructor(event: H3Event<EventHandlerRequest>) {
		super(event);
	}

	public async builder<T, K>(response: TRawResponse<T>): Promise<K[]> {
		return [] as K[];
	}

	public async query(params: { q: string; count?: number }): Promise<TSearchResult> {
		if (!params.q) {
			throw createError({
				statusCode: 400,
				message: "You must to specify search value"
			});
		}

		const requestParams = {
			owner_id: this.event.context.user.id,
			section: "search",
			q: String(params.q)
		} as TGetSectionParams & { q: string };

		const res = await this.getSection<TGetSectionPayload>(requestParams);

		const htmlRaw = res.payload?.[1]?.[0];
		const html = Array.isArray(htmlRaw) ? htmlRaw.join("") : (htmlRaw || "");
		const payload = res.payload?.[1]?.[1];

		let list: TRawAudio[] = [];
		let audios: TAudio[] = [];

		// В поиске треки находятся в payload.playlists[0].list или payload.playlist.list
		if (payload?.playlists?.[0]?.list) {
			list = payload.playlists[0].list;
		} else if (payload?.playlist?.list) {
			list = payload.playlist.list;
		} else if (payload?.playlistData?.list) {
			list = payload.playlistData.list;
		}

		if (list.length > 0) {
			const audioRequests = getAudioRequestsInstance(this.event);
			audios = await audioRequests.parseAudios(list, params);
		}

		const artists = this.builderArtists(html);
		const playlists = await this.builderPlaylists(html);

		// Извлекаем more из payload
		// В TGetSectionPayload есть sectionId, nextFrom, next_from
		let more: TMore | null = null;
		if (payload) {
			const sectionId = payload.sectionId || "";
			const nextFrom = payload.nextFrom || payload.next_from || "";

			if (sectionId && nextFrom) {
				more = {
					section_id: sectionId,
					next_from: nextFrom,
					start_from: nextFrom
				};
			} else {
				// Пробуем parseMore как fallback
				more = this.parseMore(payload);
				// Если parseMore вернул пустой объект, возвращаем null
				if (!more.section_id && !more.next_from) {
					more = null;
				}
			}
		}

		return {
			audios,
			playlists,
			artists,
			more
		};
	}

	protected builderArtists(html: string | string[]): any[] {
		if (typeof html === "string") {
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

		return [];
	}

	protected parseSearchCategories(html: string): TSearchCategory[] {
		if (typeof html !== "string" || !html) {
			return [];
		}

		const parsed = HTMLParser.parse(html);
		const categories: TSearchCategory[] = [];

		// 1. Мои треки - ищем по заголовку (правильный селектор не указан)
		const ownedAudiosBlock = parsed.querySelectorAll(".CatalogBlock").find(block => {
			const titleBlock = block.querySelector(".CatalogBlock__title");
			return titleBlock?.text?.trim() === "Мои треки";
		});
		if (ownedAudiosBlock) {
			const titleBlock = ownedAudiosBlock.querySelector(".CatalogBlock__title");
			const title = titleBlock?.text || "Мои треки";
			const linkBlock = ownedAudiosBlock.querySelector(".audio_page_block__show_all_link");
			const link = linkBlock?.attributes.href;
			const typeParam = link ? this.extractTypeFromLink(link) : undefined;

			categories.push({
				id: "owned_audios",
				title: this.unescape(title),
				type: "owned_audios",
				sectionId: typeParam,
				link
			});
		}

		// 2. Все треки (CatalogBlock__search_global_audios_header)
		const globalAudiosHeader = parsed.querySelector(".CatalogBlock__search_global_audios_header");
		if (globalAudiosHeader) {
			const globalAudiosBlock = globalAudiosHeader.closest(".CatalogBlock");
			if (globalAudiosBlock) {
				const titleBlock = globalAudiosBlock.querySelector(".CatalogBlock__title");
				const title = titleBlock?.text || "Все треки";
				const contentBlock = globalAudiosBlock.querySelector(".CatalogBlock__search_global_audios");
				const sectionId = contentBlock?.attributes["data-id"];
				const nextFrom = contentBlock?.attributes["data-next"];
				const linkBlock = globalAudiosBlock.querySelector(".audio_page_block__show_all_link");
				const link = linkBlock?.attributes.href;

				categories.push({
					id: "global_audios",
					title: this.unescape(title),
					type: "global_audios",
					sectionId: sectionId || this.extractTypeFromLink(link || ""),
					link,
					more: nextFrom ? { section_id: sectionId || "", next_from: nextFrom } : undefined
				});
			}
		}

		// 3. Альбомы (CatalogBlock__search_global_albums_header)
		const albumsHeader = parsed.querySelector(".CatalogBlock__search_global_albums_header");
		if (albumsHeader) {
			const albumsBlock = albumsHeader.closest(".CatalogBlock");
			if (albumsBlock) {
				const titleBlock = albumsBlock.querySelector(".CatalogBlock__title");
				const title = titleBlock?.text || "Альбомы";
				const linkBlock = albumsBlock.querySelector(".audio_page_block__show_all_link");
				const link = linkBlock?.attributes.href;
				const typeParam = link ? this.extractTypeFromLink(link) : undefined;

				categories.push({
					id: "albums",
					title: this.unescape(title),
					type: "albums",
					sectionId: typeParam,
					link
				});
			}
		}

		// 4. Музыканты (CatalogBlock__search_global_artists_header)
		const artistsBlock = parsed.querySelector(".CatalogBlock__search_global_artists_header");
		if (artistsBlock) {
			const titleBlock = artistsBlock.querySelector(".CatalogBlock__title");
			const title = titleBlock?.text || "Музыканты";
			const linkBlock = artistsBlock.querySelector(".audio_page_block__show_all_link");
			const link = linkBlock?.attributes.href;
			const typeParam = link ? this.extractTypeFromLink(link) : undefined;

			categories.push({
				id: "artists",
				title: this.unescape(title),
				type: "artists",
				sectionId: typeParam,
				link
			});
		}

		// 5. Все плейлисты (CatalogBlock__search_global_playlists_header)
		const playlistsHeader = parsed.querySelector(".CatalogBlock__search_global_playlists_header");
		if (playlistsHeader) {
			const playlistsBlock = playlistsHeader.closest(".CatalogBlock");
			if (playlistsBlock) {
				const titleBlock = playlistsBlock.querySelector(".CatalogBlock__title");
				const title = titleBlock?.text || "Все плейлисты";
				const linkBlock = playlistsBlock.querySelector(".audio_page_block__show_all_link");
				const link = linkBlock?.attributes.href;
				const typeParam = link ? this.extractTypeFromLink(link) : undefined;

				categories.push({
					id: "playlists",
					title: this.unescape(title),
					type: "playlists",
					sectionId: typeParam,
					link
				});
			}
		}

		// 6. Найдено в тексте - ищем по заголовку (правильный селектор не указан)
		const textFoundBlock = parsed.querySelectorAll(".CatalogBlock").find(block => {
			const titleBlock = block.querySelector(".CatalogBlock__title");
			return titleBlock?.text?.trim() === "Найдено в тексте";
		});
		if (textFoundBlock) {
			const titleBlock = textFoundBlock.querySelector(".CatalogBlock__title");
			const title = titleBlock?.text || "Найдено в тексте";
			const linkBlock = textFoundBlock.querySelector(".audio_page_block__show_all_link");
			const link = linkBlock?.attributes.href;
			const typeParam = link ? this.extractTypeFromLink(link) : undefined;

			categories.push({
				id: "text_found",
				title: this.unescape(title),
				type: "text_found",
				sectionId: typeParam,
				link
			});
		}

		return categories;
	}

	protected extractTypeFromLink(link: string): string | undefined {
		if (!link) {
			return undefined;
		}

		// Синхронная обработка, так как new URL может выбросить исключение синхронно
		const parsedUrl = (() => {
			try {
				return new URL(link, "https://vk.com");
			} catch {
				return null;
			}
		})();

		if (parsedUrl) {
			const typeParam = parsedUrl.searchParams.get("type");
			return typeParam || undefined;
		}

		// Если link не полный URL, попробуем извлечь параметр напрямую
		const match = link.match(/[?&]type=([^&]+)/);
		return match ? match[1] : undefined;
	}

	protected async builderPlaylists(html: string | string[]): Promise<TPlaylist[]> {
		if (typeof html === "string") {
			const playlistsRequests = getPlaylistsRequestsInstance(this.event);
			const mockResponse: TRawResponse<TGetCatalogSectionPayload> = {
				langKeys: { global: [], local: {} },
				langVersion: "",
				loaderVersion: "",
				pageviewCandidate: false,
				payload: { 0: 0, 1: [html, { playlists: [], playlist: {} as any, next_from: "", nextFrom: "", search_qurery: "", hints: [], searchParams: [], title: "", sectionId: "", blockIds: [], isBlockPagination: false, qid: null }] },
				static: "",
				statsMeta: { hash: "", id: 0, platform: "", reloadVersion: 0, st: true, time: 0 },
				templates: { audio_bits_to_cls: "", _: "" }
			};
			return await playlistsRequests.builder(mockResponse);
		}

		return [];
	}

	public async queryExtended(q: string, params: { count?: number; forcePlaylist?: boolean } = {}): Promise<TSearchResult> {
		if (!q) {
			throw createError({
				statusCode: 400,
				message: "You must to specify search value"
			});
		}

		// Аналогично meridius-core/lib/requests/search.js строка 68
		params.forcePlaylist = true;

		const requestParams = {
			owner_id: this.event.context.user.id,
			section: "search",
			q: String(q)
		} as TGetSectionParams & { q: string };

		const response = await this.getSection<TGetSectionPayload>(requestParams);

		const htmlRaw = response.payload?.[1]?.[0];
		const html = Array.isArray(htmlRaw) ? htmlRaw.join("") : (htmlRaw || "");
		const data = response.payload?.[1]?.[1];

		const parsed = HTMLParser.parse(html);
		const artistsBlock = parsed.querySelector(".CatalogBlock__search_global_artists_header");

		// Извлекаем more используя parseMore с params (аналогично meridius-core строка 83)
		// parseMore с forcePlaylist=true использует data.playlist.id и data.playlist.nextOffset
		const more = data ? this.parseMore(data, params) : null;

		const audioRequests = getAudioRequestsInstance(this.event);
		const playlistsRequests = getPlaylistsRequestsInstance(this.event);

		// Парсим категории из HTML
		const categories = this.parseSearchCategories(html);

		const userId = this.event.context.user.id;

		// Заполняем данные для каждой категории
		for (const category of categories) {
			if (category.type === "global_audios" && category.sectionId) {
				// Для "Все треки" загружаем через load_catalog_section
				const categoryData = await this.loadCategoryBySectionId(category.sectionId).catch(() => null);

				if (categoryData) {
					category.audios = categoryData.audios.filter(audioItem => audioItem.owner_id !== userId);
					category.more = categoryData.more;

					if (category.more && this.validateMore(category.more)) {
						category.next = async () => {
							const nextData = await this.loadCategoryBySectionId(category.sectionId!, category.more!.next_from).catch(() => null);
							if (!nextData) {
								return category;
							}
							const filteredNextAudios = nextData.audios.filter(audioItem => audioItem.owner_id !== userId);
							return {
								...category,
								audios: [...(category.audios || []), ...filteredNextAudios],
								more: nextData.more,
								next: nextData.more && this.validateMore(nextData.more)
									? category.next
									: undefined
							};
						};
					}
				} else {
					// Если не удалось загрузить, оставляем пустым
					category.audios = [];
				}
			} else if (category.type === "owned_audios") {
				// "Мои треки" - ищем блок по заголовку
				const ownedBlock = parsed.querySelectorAll(".CatalogBlock").find(block => {
					const titleBlock = block.querySelector(".CatalogBlock__title");
					return titleBlock?.text?.trim() === "Мои треки";
				});
				if (ownedBlock) {
					// Ищем список треков ТОЛЬКО внутри этого блока
					const audioListBlock = ownedBlock.querySelector("._audio_page__audio_rows_list");
					if (audioListBlock) {
						const audioHTML = audioListBlock.innerHTML;
						const mockResponse: TRawResponse<TGetCatalogSectionPayload> = {
							langKeys: { global: [], local: {} },
							langVersion: "",
							loaderVersion: "",
							pageviewCandidate: false,
							payload: { 0: 0, 1: [audioHTML, { playlists: [], playlist: {} as any, next_from: "", nextFrom: "", search_qurery: "", hints: [], searchParams: [], title: "", sectionId: "", blockIds: [], isBlockPagination: false, qid: null }] },
							static: "",
							statsMeta: { hash: "", id: 0, platform: "", reloadVersion: 0, st: true, time: 0 },
							templates: { audio_bits_to_cls: "", _: "" }
						};
						const parsedAudios = await audioRequests.builder(mockResponse);
						if (parsedAudios.length > 0) {
							// Фильтруем только треки с правильным context
							category.audios = (parsedAudios as TAudio[]).filter(audio =>
								audio.context === "search_results:search_owned_audios"
							);
						}
					}
				}
				// Fallback: используем данные из payload только если это точно "Мои треки"
				if (!category.audios || category.audios.length === 0) {
					const ownedBlockCheck = parsed.querySelectorAll(".CatalogBlock").find(block => {
						const titleBlock = block.querySelector(".CatalogBlock__title");
						return titleBlock?.text?.trim() === "Мои треки";
					});
					if (ownedBlockCheck) {
						const list = data?.playlist?.list || data?.playlistData?.list || [];
						if (list.length > 0) {
							const parsedAudios = await audioRequests.parseAudios(list, params);
							// Фильтруем только треки с правильным context
							category.audios = parsedAudios.filter(audio =>
								audio.context === "search_results:search_owned_audios"
							);
						}
					}
				}
			} else if (category.type === "artists") {
				// "Музыканты" - используем builderArtists
				category.artists = this.builderArtists(html);
			} else if (category.type === "playlists") {
				// "Все плейлисты" - сначала пробуем получить из payload
				if (data?.playlists && Array.isArray(data.playlists) && data.playlists.length > 0) {
					// Если плейлисты пришли в payload напрямую
					const rawPlaylists = data.playlists.filter((p: any) => p && (p.id || p.playlist_id));
					if (rawPlaylists.length > 0) {
						category.playlists = rawPlaylists.map((playlist: any) => playlistsRequests.getPlaylistInfo(playlist));
					}
				}

				// Если не получилось из payload, парсим из HTML
				if (!category.playlists || category.playlists.length === 0) {
					const playlistsHeader = parsed.querySelector(".CatalogBlock__search_global_playlists_header");
					if (playlistsHeader) {
						const playlistsBlock = playlistsHeader.closest(".CatalogBlock");
						if (playlistsBlock) {
							const playlistsHTML = playlistsBlock.querySelector("._audio_page__playlists")?.innerHTML || "";

							if (playlistsHTML) {
								// Пробуем парсить из HTML с данными из payload
								const payloadData = data?.playlists ? { playlists: data.playlists } : { playlists: [] };
								category.playlists = await playlistsRequests.builder(<TRawResponse<TGetCatalogSectionPayload>>{
									langKeys: { global: [], local: {} },
									langVersion: "",
									loaderVersion: "",
									pageviewCandidate: false,
									payload: { 0: 0, 1: [playlistsHTML, payloadData] },
									static: "",
									statsMeta: { hash: "", id: 0, platform: "", reloadVersion: 0, st: true, time: 0 },
									templates: { audio_bits_to_cls: "", _: "" }
								});
							}
						}
					}
				}

				// Fallback: используем buildCollections
				if (!category.playlists || category.playlists.length === 0) {
					const collections = playlistsRequests.buildCollections(html);
					category.playlists = collections.flatMap(c => c.playlists);
				}

				// Если все еще пусто, пробуем получить из data напрямую (разные варианты структуры)
				if (!category.playlists || category.playlists.length === 0) {
					const playlistData = data as any;
					const playlistsFromData = playlistData?.playlists || playlistData?.playlistData?.playlists || [];
					if (Array.isArray(playlistsFromData) && playlistsFromData.length > 0) {
						const rawPlaylists = playlistsFromData.filter((p: any) => p && (p.id || p.playlist_id));
						if (rawPlaylists.length > 0) {
							category.playlists = rawPlaylists.map((playlist: any) => playlistsRequests.getPlaylistInfo(playlist));
						}
					}
				}

				// Фильтруем плейлисты пользователя (owner_id === userId)
				if (category.playlists && category.playlists.length > 0) {
					category.playlists = category.playlists.filter((playlist: TPlaylist) => {
						// Скрываем плейлисты, если их owner_id === id пользователя
						return playlist.owner_id !== userId;
					});
				}
			} else if (category.type === "albums") {
				// "Альбомы" - парсим из конкретного блока категории
				const albumsHeader = parsed.querySelector(".CatalogBlock__search_global_albums_header");
				if (albumsHeader) {
					const albumsBlock = albumsHeader.closest(".CatalogBlock");
					if (albumsBlock) {
						const playlistsHTML = albumsBlock.querySelector("._audio_page__playlists")?.innerHTML || "";
						if (playlistsHTML) {
							category.playlists = await playlistsRequests.builder(<TRawResponse<TGetCatalogSectionPayload>>{
								langKeys: { global: [], local: {} },
								langVersion: "",
								loaderVersion: "",
								pageviewCandidate: false,
								payload: { 0: 0, 1: [playlistsHTML, { playlists: [], playlist: {} as any, next_from: "", nextFrom: "", search_qurery: "", hints: [], searchParams: [], title: "", sectionId: "", blockIds: [], isBlockPagination: false, qid: null }] },
								static: "",
								statsMeta: { hash: "", id: 0, platform: "", reloadVersion: 0, st: true, time: 0 },
								templates: { audio_bits_to_cls: "", _: "" }
							});
						}
					}
				}
			} else if (category.type === "text_found") {
				// "Найдено в тексте" - ищем блок по заголовку
				const textFoundBlock = parsed.querySelectorAll(".CatalogBlock").find(block => {
					const titleBlock = block.querySelector(".CatalogBlock__title");
					return titleBlock?.text?.trim() === "Найдено в тексте";
				});
				if (textFoundBlock) {
					// Ищем список треков ТОЛЬКО внутри этого блока
					const audioListBlock = textFoundBlock.querySelector("._audio_page__audio_rows_list");

					if (audioListBlock) {
						category.audios = await audioRequests.builder(<TRawResponse<TGetCatalogSectionPayload>>{
							langKeys: { global: [], local: {} },
							langVersion: "",
							loaderVersion: "",
							pageviewCandidate: false,
							payload: { 0: 0, 1: [audioListBlock.innerHTML, { playlists: [], playlist: {} as any, next_from: "", nextFrom: "", search_qurery: "", hints: [], searchParams: [], title: "", sectionId: "", blockIds: [], isBlockPagination: false, qid: null }] },
							static: "",
							statsMeta: { hash: "", id: 0, platform: "", reloadVersion: 0, st: true, time: 0 },
							templates: { audio_bits_to_cls: "", _: "" }
						});
					}
				}
			}
		}

		// Фильтруем категории "Мои треки", "Альбомы" и "Найдено в тексте"
		const filteredCategories = categories.filter(cat =>
			cat.type !== "owned_audios" &&
			cat.type !== "albums" &&
			cat.type !== "text_found"
		);

		// Для обратной совместимости оставляем старые поля
		const list = data?.playlists?.[0]?.list || data?.playlist?.list || [];
		const allAudios = await audioRequests.parseAudios(list, params);
		const audios = allAudios.filter(audioItem => audioItem.owner_id !== userId);
		const artists = this.builderArtists(html);
		const playlists = await this.builderPlaylists(html);
		const collections = playlistsRequests.buildCollections(html);

		return {
			audios,
			playlists,
			artists,
			more,
			collections,
			categories: filteredCategories,
			next: more && this.validateMore(more)
				? () => this.withMore(more, params)
				: undefined
		};
	}

	public async more(url: string, params: { count?: number } = {}): Promise<{
		audios: any[];
		more: TMore | null;
	}> {
		const data = await this.loadCatalogSectionFromPage(url);
		const audioRequests = getAudioRequestsInstance(this.event);

		return {
			audios: await audioRequests.builder(data),
			more: this.parseMore(data)
		};
	}

	public async morePlaylists(link: string): Promise<{
		playlists: TPlaylist[];
		more: TMore | null;
	}> {
		const data = await this.loadCatalogSectionFromPage(link);
		const playlistsRequests = getPlaylistsRequestsInstance(this.event);
		const response = data as TRawResponse<TGetCatalogSectionPayload>;

		return {
			playlists: await playlistsRequests.builder(data),
			more: this.parseMore(response.payload[1][1])
		};
	}

	public async hints(params: { q: string }): Promise<Array<[string, string]>> {
		if (!params.q) {
			return [];
		}

		const response = await this.request<TRawResponse<THintsPayload>>({
			act: "a_gsearch_hints",
			al: 1,
			q: params.q,
			section: "audio"
		}, "hints.php");

		const payload = (response.payload[1] as TPayload<[Array<[unknown, string, unknown, string]>]>)[1][0];

		if (!payload || !Array.isArray(payload)) {
			return [];
		}

		return payload.map((r: [unknown, string, unknown, string]) => {
			return [r[1], r[3]] as [string, string];
		}).filter((item): item is [string, string] => item[0] !== null && item[1] !== null);
	}

	public async inAudios(params: {
		q: string;
		owner_id?: number;
		count?: number;
	}): Promise<{
		list: any[];
		q: string;
	}> {
		if (!params.q) {
			throw createError({
				statusCode: 400,
				message: "You must to specify query for search"
			});
		}

		const owner_id = Number(params.owner_id) || this.event.context.user.id;

		const response = await this.getSection<TGetSectionPayload>({
			owner_id,
			section: "search",
			q: params.q
		} as TGetSectionParams & { q: string });

		const audioRequests = getAudioRequestsInstance(this.event);
		const htmlPayload = response.payload[1][0] as string;
		const mockResponse: TRawResponse<TGetGeneralSectionPayload> = {
			langKeys: { global: [], local: {} },
			langVersion: "",
			loaderVersion: "",
			pageviewCandidate: false,
			payload: { 0: 0, 1: [htmlPayload, { playlist: { list: [] } as any }] },
			static: "",
			statsMeta: { hash: "", id: 0, platform: "", reloadVersion: 0, st: true, time: 0 },
			templates: { audio_bits_to_cls: "", _: "" }
		};
		const matches = await audioRequests.builder(mockResponse);

		return {
			list: matches.filter((a: any) => a.owner_id === owner_id),
			q: params.q
		};
	}

	public async loadCategoryBySectionId(sectionId: string, nextFrom?: string): Promise<{
		audios: TAudio[];
		more: TMore | null;
	}> {
		if (!sectionId) {
			throw createError({
				statusCode: 400,
				message: "sectionId is required"
			});
		}

		const more: TMore = {
			section_id: sectionId,
			next_from: nextFrom || "",
			start_from: nextFrom || ""
		};

		const response = await this.loadCatalogSection<TGetCatalogSectionPayload>(more);
		const audioRequests = getAudioRequestsInstance(this.event);

		// Парсим треки из ответа
		const catalogResponse = response as TRawResponse<TGetCatalogSectionPayload>;
		const payloadValue = catalogResponse.payload[1];

		let rawAudios: TRawAudio[] = [];
		if (Array.isArray(payloadValue) && payloadValue.length > 1 && payloadValue[1] && typeof payloadValue[1] === "object") {
			const playlistData = payloadValue[1] as { playlist?: { list?: TRawAudio[] } };
			rawAudios = playlistData.playlist?.list || [];
		}

		const audios = await audioRequests.parseAudios(rawAudios);
		const moreData = Array.isArray(payloadValue) && payloadValue.length > 1 && payloadValue[1] && typeof payloadValue[1] === "object"
			? payloadValue[1]
			: null;

		return {
			audios,
			more: moreData ? this.parseMore(moreData) : null
		};
	}

	protected async withMore(more: TMore, params: { count?: number } = {}): Promise<TSearchResult> {
		const audioRequests = getAudioRequestsInstance(this.event);
		const response = await this.getDataWithMore(audioRequests, more, params);

		const userId = this.event.context.user.id;
		const filteredAudios = response.list.filter(audioItem => audioItem.owner_id !== userId);

		return {
			audios: filteredAudios,
			playlists: [],
			artists: [],
			more: response.more,
			next: response.more && this.validateMore(response.more)
				? () => this.withMore(response.more, params)
				: undefined
		};
	}

	protected parseLink(object: any): {
		link?: string;
		params?: URLSearchParams;
	} {
		if (!object) {
			return {};
		}

		const linkBlock = object.querySelector(".audio_page_block__show_all_link");

		if (linkBlock) {
			const link = linkBlock.attributes.href;
			const queryString = link?.replace(/(.*?)\?/, "");

			return {
				link,
				params: queryString ? new URLSearchParams(queryString) : undefined
			};
		}

		return {};
	}

	public async loadCategoryPlaylists(link: string, nextFrom?: string): Promise<{
		playlists: TPlaylist[];
		more: TMore | null;
	}> {
		if (!link) {
			throw createError({
				statusCode: 400,
				message: "link is required"
			});
		}

		let data: TRawResponse<TGetCatalogSectionPayload>;
		let sectionId: string | null = null;

		// Извлекаем sectionId из ссылки (type параметр)
		const typeParam = this.extractTypeFromLink(link);
		if (typeParam) {
			sectionId = typeParam;
		}

		// Если есть sectionId, используем loadCatalogSection напрямую
		if (sectionId) {
			const more: TMore = {
				section_id: sectionId,
				next_from: nextFrom || "",
				start_from: nextFrom || ""
			};
			data = await this.loadCatalogSection<TGetCatalogSectionPayload>(more);
		} else {
			// Если нет sectionId, пробуем загрузить страницу
			data = await this.loadCatalogSectionFromPage(link);

			// Пробуем получить sectionId из ответа
			const response = data as TRawResponse<TGetCatalogSectionPayload>;
			const payloadValue = response.payload[1];
			if (Array.isArray(payloadValue) && payloadValue.length > 1 && payloadValue[1] && typeof payloadValue[1] === "object") {
				sectionId = (payloadValue[1] as { sectionId?: string }).sectionId || null;
			}
		}

		const playlistsRequests = getPlaylistsRequestsInstance(this.event);
		const response = data as TRawResponse<TGetCatalogSectionPayload>;
		const payloadValue = response.payload[1];

		let playlists: TPlaylist[] = [];
		if (Array.isArray(payloadValue) && payloadValue.length > 1 && payloadValue[1] && typeof payloadValue[1] === "object") {
			const payloadData = payloadValue[1] as { playlists?: any[] };
			if (payloadData.playlists && Array.isArray(payloadData.playlists)) {
				playlists = await playlistsRequests.builder(data);
			}
		}

		// Если не получилось из payload, пробуем через builder
		if (playlists.length === 0) {
			playlists = await playlistsRequests.builder(data);
		}

		const userId = this.event.context.user.id;
		playlists = playlists.filter((playlist: TPlaylist) => playlist.owner_id !== userId);

		const moreData = Array.isArray(payloadValue) && payloadValue.length > 1 && payloadValue[1] && typeof payloadValue[1] === "object"
			? payloadValue[1]
			: null;

		return {
			playlists,
			more: moreData ? this.parseMore(moreData) : null
		};
	}

	public async loadCategoryArtists(link: string, nextFrom?: string): Promise<{
		artists: TArtist[];
		more: TMore | null;
	}> {
		if (!link) {
			throw createError({
				statusCode: 400,
				message: "link is required"
			});
		}

		// Извлекаем sectionId из ссылки (type параметр)
		const typeParam = this.extractTypeFromLink(link);
		let artists: TArtist[] = [];
		let more: TMore | null = null;
		let html: string = "";

		// Если есть sectionId, используем loadCatalogSection
		if (typeParam) {
			const moreParam: TMore = {
				section_id: typeParam,
				next_from: nextFrom || "",
				start_from: nextFrom || ""
			};

			const response = await this.loadCatalogSection<TGetCatalogSectionPayload>(moreParam);
			const catalogResponse = response as TRawResponse<TGetCatalogSectionPayload>;
			const payloadValue = catalogResponse.payload[1];

			// Извлекаем HTML из ответа (payloadValue[0] - это HTML строка)
			if (Array.isArray(payloadValue) && payloadValue.length > 0) {
				html = Array.isArray(payloadValue[0]) ? payloadValue[0].join("") : (payloadValue[0] || "");
			}

			// Парсим артистов из HTML
			artists = this.builderArtists(html);

			// Извлекаем more данные из payload (payloadValue[1] - это объект с данными)
			if (Array.isArray(payloadValue) && payloadValue.length > 1 && payloadValue[1] && typeof payloadValue[1] === "object") {
				const payloadData = payloadValue[1] as { sectionId?: string; next_from?: string; nextFrom?: string };
				if (payloadData.sectionId && (payloadData.next_from || payloadData.nextFrom)) {
					more = {
						section_id: payloadData.sectionId,
						next_from: payloadData.next_from || payloadData.nextFrom || "",
						start_from: payloadData.next_from || payloadData.nextFrom || ""
					};
				}
			}
		} else {
			// Если нет type параметра, загружаем страницу и парсим
			const page = await this.request<string>({}, link);
			artists = this.builderArtists(page);

			// Пробуем найти more данные
			const sectionIdMatch = page.match(/sectionId["\s]*[:=]["\s]*([^"}\s]+)/);
			const nextFromMatch = page.match(/nextFrom["\s]*[:=]["\s]*"([^"]+)"/) || page.match(/next_from["\s]*[:=]["\s]*"([^"]+)"/);

			if (sectionIdMatch && nextFromMatch) {
				more = {
					section_id: sectionIdMatch[1],
					next_from: nextFromMatch[1],
					start_from: nextFromMatch[1]
				};
			}
		}

		return {
			artists,
			more
		};
	}
}

export const getSearchRequestsInstance = (event: H3Event<EventHandlerRequest>): SearchRequests => {
	return new SearchRequests(event);
};
