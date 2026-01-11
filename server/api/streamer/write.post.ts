import fs from "fs-extra";
import path from "path";

import type { TAudio } from "~~/server/api/vk/audio/types";

export default defineEventHandler(async (event) => {
	const body = await readBody<{
		path: string;
		song: TAudio;
	}>(event);

	if (!body || !body.path || !body.song) {
		throw createError({
			statusCode: 400,
			message: "Path and song data are required"
		});
	}

	let rootPath = body.path;

	if (!path.isAbsolute(rootPath)) {
		const os = await import("os");
		const homeDir = os.homedir();
		rootPath = path.resolve(homeDir, rootPath);
	}

	if (!await fs.pathExists(rootPath)) {
		await fs.ensureDir(rootPath);
	}

	const song = body.song;

	const performerPath = path.join(rootPath, "performer.txt");
	const titlePath = path.join(rootPath, "title.txt");
	const songPath = path.join(rootPath, "song.txt");
	const urlPath = path.join(rootPath, "url.txt");
	const coverPath = path.join(rootPath, "cover.jpg");

	await fs.writeFile(performerPath, song.performer || "", "utf-8");
	await fs.writeFile(titlePath, song.title || "", "utf-8");
	await fs.writeFile(songPath, `${song.performer || ""} — ${song.title || ""}`, "utf-8");
	await fs.writeFile(urlPath, song.url || "", "utf-8");

	const coverUrl = song.coverUrl_p || song.cover;
	let coverSaved = false;

	if (coverUrl) {
		const coverResponse = await fetch(coverUrl).catch(() => null);
		if (coverResponse && coverResponse.ok) {
			const coverArrayBuffer = await coverResponse.arrayBuffer().catch(() => null);
			if (coverArrayBuffer) {
				const coverBuffer = Buffer.from(coverArrayBuffer);
				await fs.writeFile(coverPath, coverBuffer).catch(() => null);
				coverSaved = true;
			}
		}
	}

	// Если обложка не была сохранена, используем no-cover.webp
	if (!coverSaved) {
		const noCoverPath = path.join(process.cwd(), "public", "no-cover.webp");
		if (await fs.pathExists(noCoverPath)) {
			await fs.copyFile(noCoverPath, coverPath).catch(() => null);
		}
	}

	return { success: true };
});

