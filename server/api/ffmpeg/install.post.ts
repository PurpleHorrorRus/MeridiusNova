import { writeFile, mkdir, unlink } from "fs/promises";
import { existsSync, createWriteStream } from "fs";
import AdmZip from "adm-zip";
import { downloadManager, type IFFmpegDownload } from "~~/server/utils/download-manager";

const getFFmpegUrl = (): string => {
	const platform = process.platform;
	const arch = process.arch;

	if (platform === "win32") {
		return "https://raw.githubusercontent.com/PurpleHorrorRus/Meridius/master/ffmpeg_win32_x64.zip";
	}

	return "";
};

export default defineEventHandler(async (event) => {
	const body = await readBody(event);

	if (!body || typeof body !== "object") {
		throw createError({
			statusCode: 400,
			message: "Invalid request body"
		});
	}

	const os = await import("os");
	const path = await import("path");

	const getFFmpegDir = (): string => {
		const platform = process.platform;
		const homeDir = os.homedir();

		if (platform === "win32") {
			const appData = process.env.APPDATA || path.join(homeDir, "AppData", "Roaming");
			return path.join(appData, "com.infinite.meridius", "ffmpeg");
		} else if (platform === "darwin") {
			const appData = path.join(homeDir, "Library", "Application Support", "com.infinite.meridius");
			return path.join(appData, "ffmpeg");
		} else {
			const appData = process.env.XDG_DATA_HOME || path.join(homeDir, ".local", "share");
			return path.join(appData, "com.infinite.meridius", "ffmpeg");
		}
	};

	const ffmpegDir = getFFmpegDir();

	if (!existsSync(ffmpegDir)) {
		await mkdir(ffmpegDir, { recursive: true });
	}

	const downloadId = downloadManager.generateId();
	const download: IFFmpegDownload = {
		downloadId,
		type: "ffmpeg",
		status: "queued",
		percent: 0
	};

	downloadManager.addDownload(download);

	const ffmpegUrl = getFFmpegUrl();

	if (!ffmpegUrl) {
		downloadManager.updateDownload(downloadId, {
			status: "failed",
			error: "FFmpeg download not supported for this platform"
		});
		throw createError({
			statusCode: 400,
			message: "FFmpeg download not supported for this platform"
		});
	}

	downloadManager.updateDownload(downloadId, { status: "downloading", percent: 0 });

	const response = await fetch(ffmpegUrl);

	if (!response.ok) {
		downloadManager.updateDownload(downloadId, {
			status: "failed",
			error: `Failed to download ffmpeg: ${response.statusText}`
		});
		throw createError({
			statusCode: response.status,
			message: `Failed to download ffmpeg: ${response.statusText}`
		});
	}

	const contentLength = response.headers.get("content-length");
	const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;

	const zipPath = path.join(ffmpegDir, "ffmpeg.zip");
	const writeStream = createWriteStream(zipPath);

	let downloadedBytes = 0;
	const reader = response.body?.getReader();

	if (!reader) {
		downloadManager.updateDownload(downloadId, {
			status: "failed",
			error: "Failed to get response body"
		});
		throw createError({
			statusCode: 500,
			message: "Failed to get response body"
		});
	}

	while (true) {
		const { done, value } = await reader.read();

		if (done) {
			break;
		}

		writeStream.write(value);
		downloadedBytes += value.length;

		if (totalBytes > 0) {
			const percent = Math.round((downloadedBytes / totalBytes) * 100);
			downloadManager.updateDownload(downloadId, { percent });
		}
	}

	writeStream.end();

	downloadManager.updateDownload(downloadId, { status: "processing", percent: 90 });

	const buffer = await import("fs/promises").then(fs => fs.readFile(zipPath));
	const zip = new AdmZip(buffer);
	const entries = zip.getEntries();
	const ffmpegEntry = entries.find(entry => entry.entryName.endsWith("ffmpeg.exe"));

	if (!ffmpegEntry) {
		await unlink(zipPath);
		downloadManager.updateDownload(downloadId, {
			status: "failed",
			error: "ffmpeg.exe not found in archive"
		});
		throw createError({
			statusCode: 500,
			message: "ffmpeg.exe not found in archive"
		});
	}

	const ffmpegBuffer = ffmpegEntry.getData();
	const platform = process.platform;
	const ffmpegExe = platform === "win32" ? "ffmpeg.exe" : "ffmpeg";
	const ffmpegPath = path.join(ffmpegDir, ffmpegExe);
	await writeFile(ffmpegPath, ffmpegBuffer);

	await unlink(zipPath);

	downloadManager.updateDownload(downloadId, {
		status: "completed",
		percent: 100
	});

	return {
		success: true,
		path: ffmpegPath,
		downloadId
	};
});
