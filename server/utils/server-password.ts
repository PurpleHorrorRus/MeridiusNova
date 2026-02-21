import crypto from "node:crypto";

export function hashServerPassword(plain: string, key: string): string {
	if (!key || key.length < 32) {
		return "";
	}

	return crypto.createHmac("sha256", key).update(plain, "utf8").digest("base64");
}

export function verifyServerPassword(plain: string, storedHash: string, key: string): boolean {
	if (!storedHash || !key || key.length < 32) {
		return false;
	}

	const computed = hashServerPassword(plain, key);

	if (computed.length === 0) {
		return false;
	}

	const computedBuf = Buffer.from(computed, "base64");
	const storedBuf = Buffer.from(storedHash, "base64");

	if (computedBuf.length !== storedBuf.length) {
		return false;
	}

	return crypto.timingSafeEqual(computedBuf, storedBuf);
}
