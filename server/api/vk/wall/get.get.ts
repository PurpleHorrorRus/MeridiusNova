import { BaseRequest } from "~~/server/utils/base";

export default defineEventHandler(async (event) => {
	const baseRequest = new BaseRequest(event);
	const query = getQuery(event);

	const ownerId = query.owner_id ? Number(query.owner_id) : undefined;
	const offset = query.offset ? Number(query.offset) : 0;
	const count = query.count ? Number(query.count) : 20;

	const params: Record<string, any> = {
		count: count.toString(),
		offset: offset.toString()
	};

	if (ownerId) {
		params.owner_id = ownerId.toString();
	}

	const response = await baseRequest.callVKAPI("wall.get", params);

	return {
		count: response.count || 0,
		items: response.items || [],
		next_from: response.next_from || null
	};
});







