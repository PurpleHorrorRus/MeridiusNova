import fs from "fs-extra";
import crypto from "node:crypto";

import { getSettings, SETTINGS_DIR_PATH, SETTINGS_FILE_PATH } from "~~/server/utils/settings-read";
import { hashServerPassword } from "~~/server/utils/server-password";

const PASSWORD_LENGTH = 32;
const PASSWORD_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

export default defineEventHandler(async (event) => {
	const config = useRuntimeConfig();
	const key = config.serverPasswordKey as string;

	if (!key || key.length < 32) {
		throw createError({
			status: 500,
			message: "Server password key not configured"
		});
	}

	const password = crypto.randomBytes(PASSWORD_LENGTH).reduce((acc, byte) => acc + PASSWORD_CHARS[byte % PASSWORD_CHARS.length], "");
	const passwordHash = hashServerPassword(password, key);

	if (!passwordHash) {
		throw createError({
			status: 500,
			message: "Failed to hash password"
		});
	}

	await fs.ensureDir(SETTINGS_DIR_PATH);

	const existing = await getSettings();
	const prevServer = existing?.server;
	const merged = {
		...existing,
		server: {
			enable: prevServer?.enable ?? false,
			passwordHash
		}
	};

	await fs.writeJson(SETTINGS_FILE_PATH, merged, { spaces: 4 });

	return { password };
});
