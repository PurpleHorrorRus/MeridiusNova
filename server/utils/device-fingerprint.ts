import crypto from "node:crypto";
import { getHeader } from "h3";
import type { H3Event } from "h3";

export function generateDeviceFingerprint(event: H3Event): string {
	const userAgent = getHeader(event, "user-agent") || "";
	const acceptLanguage = getHeader(event, "accept-language") || "";
	const acceptEncoding = getHeader(event, "accept-encoding") || "";
	
	const fingerprintData = `${userAgent}|${acceptLanguage}|${acceptEncoding}`;
	
	return crypto.createHash("sha256").update(fingerprintData).digest("hex");
}

export function generateSessionId(): string {
	return crypto.randomBytes(32).toString("hex");
}

export function verifyDeviceFingerprint(event: H3Event, storedFingerprint: string): boolean {
	const currentFingerprint = generateDeviceFingerprint(event);
	return currentFingerprint === storedFingerprint;
}

