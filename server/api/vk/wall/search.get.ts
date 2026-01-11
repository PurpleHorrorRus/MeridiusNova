import { BaseRequest } from "~~/server/utils/base";

export default defineEventHandler(async (event) => {
	const baseRequest = new BaseRequest(event);
	const query = getQuery(event);

	const ownerId = query.owner_id ? Number(query.owner_id) : undefined;
	const offset = query.offset ? Number(query.offset) : 0;
	const count = query.count ? Number(query.count) : 20;
	const searchQuery = query.query as string | undefined;

	if (!ownerId) {
		throw createError({
			statusCode: 400,
			message: "owner_id is required"
		});
	}

	const params: Record<string, any> = {
		owner_id: ownerId.toString(),
		count: count.toString(),
		offset: offset.toString()
	};

	if (searchQuery) {
		params.query = searchQuery;
	}

	const response = await baseRequest.callVKAPI("wall.search", params);

	return {
		count: response.count || 0,
		items: response.items || [],
		next_from: response.next_from || null
	};
});


