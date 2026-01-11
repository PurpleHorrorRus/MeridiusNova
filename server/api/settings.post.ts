import path from "node:path";
import os from "node:os";
import fs from "fs-extra";
import type { TSettings } from "../utils/types";

const SETTINGS_DIR = path.resolve(os.homedir(), ".meridius");
const SETTINGS_FILE = path.resolve(SETTINGS_DIR, "settings.json");

async function ensureSettingsDir(): Promise<void> {
    if (!fs.pathExistsSync(SETTINGS_DIR)) {
        await fs.mkdirp(SETTINGS_DIR);
    }
}

export default defineEventHandler(async (event) => {
    const body = await readBody<Partial<TSettings>>(event);

    if (!body) {
        throw createError({
            statusCode: 400,
            message: "Settings data is required"
        });
    }

    await ensureSettingsDir();

    let existingSettings: Partial<TSettings> = {};
    if (fs.pathExistsSync(SETTINGS_FILE)) {
        try {
            existingSettings = await fs.readJson(SETTINGS_FILE) as Partial<TSettings>;
        } catch {
            existingSettings = {};
        }
    }

    const mergedSettings = { ...existingSettings, ...body };
    await fs.writeJson(SETTINGS_FILE, mergedSettings, { spaces: 4 });

    return { success: true };
});