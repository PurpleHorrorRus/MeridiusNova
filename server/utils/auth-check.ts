import { createError } from "h3";
import type { H3Event } from "h3";

export function requireAuth(event: H3Event): void {
	if (!event.context.user || !event.context.user.id) {
		throw createError({
			status: 401,
			statusText: "Unauthorized - authentication required"
		});
	}
}

