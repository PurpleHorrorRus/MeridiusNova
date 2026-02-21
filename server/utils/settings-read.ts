import fs from "fs-extra";
import path from "node:path";
import os from "node:os";

import type { TSettings } from "./types";

const SETTINGS_DIR = path.resolve(os.homedir(), ".meridius");
const SETTINGS_FILE = path.resolve(SETTINGS_DIR, "settings.json");

export async function getSettings(): Promise<Partial<TSettings> | null> {
	if (!fs.pathExistsSync(SETTINGS_FILE)) {
		return null;
	}

	const [error, settings] = await fs.readJson(SETTINGS_FILE).then(
		(data) => [null, data] as const,
		(err) => [err, null] as const
	);

	if (error) {
		return null;
	}

	return settings as Partial<TSettings>;
}

export const SETTINGS_FILE_PATH = SETTINGS_FILE;
export const SETTINGS_DIR_PATH = SETTINGS_DIR;