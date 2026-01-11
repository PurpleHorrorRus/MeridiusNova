import { BaseRequest } from "~~/server/utils/base";
import { requireAuth } from "~~/server/utils/auth-check";

type TUserInfo = {
	id: number;
	first_name: string;
	last_name: string;
	photo_200?: string;
	photo_max?: string;
	photo_100?: string;
	photo_50?: string;
	screen_name?: string;
};

export default defineEventHandler(async (event) => {
	requireAuth(event);

	const baseRequest = new BaseRequest(event);
	const query = getQuery(event);

	const userIds = query.user_ids as string;
	const fields = (query.fields as string) || "photo_max,photo_200,photo_100,screen_name";

	if (!userIds) {
		return [];
	}

	const userIdsArray = userIds.split(",").map(id => id.trim()).filter(Boolean);

	if (userIdsArray.length === 0) {
		return [];
	}

	const users = await baseRequest.callVKAPI("users.get", {
		user_ids: userIdsArray.join(","),
		fields: fields
	}).catch((error: Error) => {
		console.error("Failed to get users info from VK API:", error);
		return [];
	});

	if (!users || !Array.isArray(users)) {
		return [];
	}

	return users.map((user: any) => ({
		id: user.id,
		first_name: user.first_name || "",
		last_name: user.last_name || "",
		photo_200: user.photo_200 || user.photo_max || "",
		photo_max: user.photo_max || user.photo_200 || "",
		photo_100: user.photo_100,
		photo_50: user.photo_50,
		screen_name: user.screen_name
	}));
});


