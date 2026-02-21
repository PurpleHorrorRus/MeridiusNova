import jwt from "jsonwebtoken";

import { getSettings } from "./settings-read";
import { verifyServerPassword } from "./server-password";
import { isValidSession } from "./session-storage";
import { cookieSignOptions } from "../api/vk/web-token.post";

import type { TCookie } from "~~/server/types/auth";

export type WebSocketPeer = {
	send: (data: string) => void;
	close?: (code?: number) => void;
	request?: { url?: string; headers?: { get?: (name: string) => string | null } };
};

function getCookieToken(headers: WebSocketPeer["request"]): string {
	const raw = headers?.headers?.get?.("cookie") ?? headers?.headers?.get?.("Cookie") ?? "";
	if (!raw) return "";

	const match = raw.match(/\btoken=([^;]*)/);
	return match ? decodeURIComponent(match[1].trim()) : "";
}

export async function verifyWebSocketPassword(peer: WebSocketPeer): Promise<boolean> {
	const rawUrl = peer.request?.url ?? "";
	const url = rawUrl.startsWith("http") ? new URL(rawUrl) : new URL("http://localhost" + (rawUrl || "/"));
	const password = url.searchParams.get("password") ?? "";

	const config = useRuntimeConfig();
	const key = config.serverPasswordKey as string;
	const settings = await getSettings();
	const storedHash = settings?.server?.passwordHash;

	if (password && key && storedHash && verifyServerPassword(password, storedHash, key)) {
		return true;
	}

	const token = getCookieToken(peer.request);
	if (!token) return false;

	const cookieKey = config.cookieKey as string;
	if (!cookieKey || cookieKey === "") return false;

	const decoded = await Promise.resolve(jwt.verify(token, cookieKey, cookieSignOptions as jwt.VerifyOptions) as TCookie).catch(() => null);
	if (!decoded || !decoded.sessionId || !decoded.deviceFingerprint) return false;
	if (decoded.expires < Date.now() / 1000) return false;

	return isValidSession(decoded.sessionId, decoded.user_id);
}