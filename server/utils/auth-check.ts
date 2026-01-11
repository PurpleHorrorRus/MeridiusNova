import { createError } from "h3";
import type { H3Event } from "h3";

export function requireAuth(event: H3Event): void {
	if (!event.context.user || !event.context.user.id) {
		throw createError({
			statusCode: 401,
			statusMessage: "Unauthorized - authentication required"
		});
	}
}

