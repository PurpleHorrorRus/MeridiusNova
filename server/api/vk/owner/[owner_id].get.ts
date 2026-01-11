import { BaseRequest } from "~~/server/utils/base";
import { requireAuth } from "~~/server/utils/auth-check";

type TOwnerInfo = {
	id: number;
	name: string;
	photo?: string;
	type: "user" | "group";
};

export default defineEventHandler(async (event) => {
	requireAuth(event);

	const baseRequest = new BaseRequest(event);
	const owner_id = Number(getRouterParam(event, "owner_id"));

	if (!owner_id) {
		throw createError({
			statusCode: 400,
			message: "owner_id is required"
		});
	}

	const isUser = owner_id > 0;

	if (isUser) {
		const users = await baseRequest.callVKAPI("users.get", {
			user_ids: Math.abs(owner_id).toString(),
			fields: "photo_100,photo_max"
		}).catch(() => []);

		if (!users || !Array.isArray(users) || users.length === 0) {
			throw createError({
				statusCode: 404,
				message: "User not found"
			});
		}

		const user = users[0];
		return {
			id: user.id,
			name: `${user.first_name || ""} ${user.last_name || ""}`.trim(),
			photo: user.photo_100 || user.photo_max || "",
			type: "user" as const
		} satisfies TOwnerInfo;
	} else {
		const response = await baseRequest.callVKAPI("groups.getById", {
			group_ids: Math.abs(owner_id).toString(),
			fields: "photo_100"
		}).catch(() => ({ groups: [] }));

		if (!response || !response.groups || !Array.isArray(response.groups) || response.groups.length === 0) {
			throw createError({
				statusCode: 404,
				message: "Group not found"
			});
		}

		const group = response.groups[0];
		return {
			id: -Math.abs(group.id),
			name: group.name || "",
			photo: group.photo_100 || "",
			type: "group" as const
		} satisfies TOwnerInfo;
	}
});

