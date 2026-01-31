import { getSearchRequestsInstance } from "./search";

import type { TMore } from "~~/server/utils/types";

export default defineEventHandler(async (event) => {
	const searchRequests = getSearchRequestsInstance(event);
	const query = getQuery(event);

	// Если есть category_id и next_from, загружаем следующую страницу категории
	if (query.category_id && query.next_from) {
		const categoryData = await searchRequests.loadCategoryBySectionId(
			query.category_id as string,
			query.next_from as string
		);

		return {
			audios: categoryData.audios,
			playlists: [],
			artists: [],
			more: categoryData.more
		};
	}

	// Если есть section_id и next_from (старый формат для обратной совместимости)
	const more: TMore = {};
	if (query.section_id && query.next_from) {
		more.section_id = query.section_id as string;
		more.next_from = query.next_from as string;
		more.start_from = query.start_from as string || query.next_from as string;
	}

	if (more.section_id && more.next_from) {
		const audioRequests = await import("~~/server/api/vk/audio/audio").then(m => m.getAudioRequestsInstance(event));
		const response = await searchRequests.getDataWithMore(audioRequests, more, {
			count: query.count ? Number(query.count) : undefined
		});

		return {
			audios: response.list || [],
			playlists: [],
			artists: [],
			more: response.more
		};
	}

	if (!query.q) {
		throw createError({
			status: 400,
			message: "Query parameter 'q' is required"
		});
	}

	return await searchRequests.queryExtended(query.q as string, {
		count: query.count ? Number(query.count) : undefined
	});
});

