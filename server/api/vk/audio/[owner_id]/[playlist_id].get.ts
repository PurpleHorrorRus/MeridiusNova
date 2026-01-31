import { getAudioRequestsInstance } from "~~/server/api/vk/audio/audio";
import { requireAuth } from "~~/server/utils/auth-check";

import type { TAudio } from "~~/server/api/vk/audio/types";
import type { TGetCatalogSectionPayload, TGetGeneralSectionPayload, TGetSectionPayload, TMore, TRawResponse } from "~~/server/utils/types";

export default defineEventHandler(async (event) => {
	requireAuth(event);

    const audioRequests = getAudioRequestsInstance(event);
	const owner_id = Number(getRouterParam(event, "owner_id"));
	const playlist_id = Number(getRouterParam(event, "playlist_id"));

	if (isNaN(owner_id) || isNaN(playlist_id)) {
		throw createError({
			status: 400,
			statusText: "Invalid owner_id or playlist_id"
		});
	}

	const query = getQuery<TMore & { access_hash?: string; count?: string; offset?: string }>(event);

	if (query.section_id && query.next_from) {
		const result = await audioRequests.requestMore<TGetCatalogSectionPayload, TAudio>(query);
		
		if (result && typeof result === "object" && "list" in result) {
			// builder already calls parseAudios, so list is already TAudio[]
			return {
				audios: result.list as TAudio[],
				more: result.more
			};
		}
		
		return result;
	}

	// Если playlist_id === -1, это "моя музыка" пользователя
	// Если playlist_id !== -1, это конкретный плейлист
	if (playlist_id === -1) {
		// Загружаем все треки пользователя
		// Аналогично meridius-core/lib/requests/audio.js строка 37-43
		const section = await audioRequests.getSection<TGetSectionPayload>({
			owner_id: Number(owner_id),
			section: "all"
		});

		// Парсим треки и извлекаем more из payload[1][1]
		const payloadData = section.payload[1][1];
		const audios = await audioRequests.parseAudios(payloadData?.playlist?.list || [], {
			count: query.count ? Number(query.count) : undefined,
			withUrls: false
		});

		// Извлекаем more используя parseMore
		const more = audioRequests.parseMore(payloadData || {});

		return {
			audios,
			more
		};
	}

	// Для конкретного плейлиста используем подход из meridius-core:
	// Сначала получаем плейлист через load_section, находим его id (section_id),
	// затем используем loadCatalogSection для получения треков с поддержкой more
	const { getPlaylistsRequestsInstance } = await import("~~/server/api/vk/playlists/playlists");
	const playlistsRequests = getPlaylistsRequestsInstance(event);
	
	// Сначала пытаемся получить плейлист напрямую через VK API
	let raw_playlist: any = null;
	let section_id: string | null = null;
	
	const isMy = Number(owner_id) === event.context.user.id;
	let context = isMy ? "my" : "user_playlists";

	if (Number(owner_id) < 0) {
		context = "group_list";
	}

	const playlistResponse = await playlistsRequests.request<TRawResponse<any>>({
		act: "load_section",
		access_hash: query.access_hash || "",
		al: 1,
		claim: 0,
		context,
		from_id: Number(owner_id),
		is_loading_all: 1,
		is_preload: 0,
		offset: 0,
		owner_id: Number(owner_id),
		playlist_id: Number(playlist_id),
		type: "playlist"
	});

	raw_playlist = playlistResponse.payload[1]?.[0];


	if (raw_playlist) {
		section_id = raw_playlist.id || String(playlist_id);
	} else {
		// Если raw_playlist не получен, используем playlist_id как section_id
		section_id = String(playlist_id);
	}

	if (!section_id) {
		return {
			audios: [],
			more: {
				next_from: "",
				section_id: "",
				start_from: ""
			}
		};
	}

	// Используем loadCatalogSection для получения треков с поддержкой more
	// Аналогично meridius-core/lib/requests/audio.js строка 30-34
	const more: TMore = {
		section_id: String(section_id),
		next_from: query.next_from || "",
		start_from: query.next_from || ""
	};

	const catalogResponse = await audioRequests.loadCatalogSection<TGetCatalogSectionPayload>(more);
	
	// Парсим ответ используя parsePayload (аналогично meridius-core)
	// parsePayload принимает payload[1][1], но мы передаем весь payload
	const result = await audioRequests.parsePayload(catalogResponse.payload, {
		count: query.count ? Number(query.count) : undefined,
		withUrls: false
	});

	return {
		audios: result.audios,
		more: result.more
	};
});