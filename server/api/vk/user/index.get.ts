import { BaseRequest } from "~~/server/utils/base";
import { requireAuth } from "~~/server/utils/auth-check";
import type { EventHandlerRequest, H3Event } from "h3";

type TUserInfo = {
	id: number;
	first_name: string;
	last_name: string;
	photo_200: string;
	photo_max?: string;
	photo_100?: string;
	photo_50?: string;
	screen_name?: string;
};

class UserRequests extends BaseRequest {
	constructor(event: H3Event<EventHandlerRequest>) {
		super(event);
	}

	public async getUserInfo(): Promise<TUserInfo | null> {
		if (!this.event.context.user?.id) {
			return null;
		}

		const users = await this.callVKAPI("users.get", {
				user_ids: this.event.context.user.id.toString(),
				fields: "photo_max,screen_name"
		}).catch((error: Error) => {
			console.error("Failed to get user info from VK API:", error);
			return null;
			});

		if (!users || !Array.isArray(users) || users.length === 0) {
			return null;
		}

		const [user] = users;
			if (!user) {
				return null;
			}

			return {
				id: user.id || this.event.context.user.id,
				first_name: user.first_name || "",
				last_name: user.last_name || "",
				photo_200: user.photo_200 || user.photo_max || "",
				photo_max: user.photo_max || user.photo_200 || "",
				photo_100: user.photo_100,
				photo_50: user.photo_50,
				screen_name: user.screen_name
			};
	}
}

export default defineEventHandler(async (event) => {
	requireAuth(event);
	
	const userRequests = new UserRequests(event);
	return await userRequests.getUserInfo();
});

