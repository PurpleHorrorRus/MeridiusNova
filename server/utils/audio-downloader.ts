import fs from "fs-extra";
import path from "path";
import crypto from "crypto";
import filenamify from "filenamify";
import ffmpeg from "fluent-ffmpeg";
import { Parser as M3U8Parser } from "m3u8-parser";
import Bluebird from "bluebird";
// @ts-ignore - нет типов для node-fetch-retry
import fetch from "node-fetch-retry";
import type { TAudio } from "../api/vk/audio/types";

const fetchOptions = {
	retry: 10,
	pause: 3000,
	headers: {
		"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:106.0) Gecko/20100101 Firefox/106.0"
	}
};

const defaultParams = {
	output: "./output",
	name: null as string | null,
	chunks: "",
	delete: true,
	concurrency: 5,
	metadata: [] as Array<[string, string]>,
	onProgress: (percent: number) => false,
	onProcessing: () => false
};

const ffmpegConfig = {
	format: "concat",
	options: ["-safe 0"],
	codec: "libmp3lame",
	bitrate: 320,
	coverOptions: ["-map 0:0", "-map 1:0", "-id3v2_version 3"]
};

export interface IAudioDownloadParams {
	ffmpeg: string;
	output: string;
	name?: string | null;
	chunks?: string;
	delete?: boolean;
	concurrency?: number;
	metadata?: Array<[string, string]>;
	onProgress?: (percent: number) => void;
	onProcessing?: () => void;
}

export class AudioDownloader {
	private audio: TAudio;
	private params: Required<IAudioDownloadParams>;
	private key: Buffer | null = null;
	private root: string | null = null;

	constructor(audio: TAudio, params: IAudioDownloadParams) {
		if (!params.ffmpeg) {
			throw new Error("You must to specify ffmpeg executable path");
		}

		if (!fs.existsSync(params.ffmpeg)) {
			throw new Error("ffmpeg executable not found");
		}

		ffmpeg.setFfmpegPath(params.ffmpeg);

		this.audio = audio;

		const chunksPath = params.chunks || path.resolve(`hls_${Math.floor(Math.random() * 1000)}`);
		this.params = {
			output: params.output,
			name: params.name || null,
			chunks: chunksPath,
			delete: params.delete !== undefined ? params.delete : defaultParams.delete,
			concurrency: params.concurrency || defaultParams.concurrency,
			metadata: params.metadata || defaultParams.metadata,
			onProgress: params.onProgress || defaultParams.onProgress,
			onProcessing: params.onProcessing || defaultParams.onProcessing,
			ffmpeg: params.ffmpeg
		};

		if (!fs.existsSync(this.params.chunks)) {
			fs.mkdirsSync(this.params.chunks);
		}

		if (!fs.existsSync(this.params.output)) {
			fs.mkdirsSync(this.params.output);
		}
	}

	private normalizeUri(uri: string, root: string): string {
		return !uri.startsWith("http")
			? `${root}/${uri}`
			: uri;
	}

	private async parse(link: string): Promise<Array<{ name: string; url: string; method: string }>> {
		const data = await fetch(link, fetchOptions);
		const parser = new M3U8Parser();

		parser.push(await data.text());
		parser.end();

		const chunks: Array<{ name: string; url: string; method: string }> = [];

		this.root = link.match(/(.*?)\/index/)?.[1] || "";

		for (const segment of parser.manifest.segments) {
			if (!this.key && segment.key) {
				segment.key.uri = this.normalizeUri(segment.key.uri, this.root);
				const keyResponse = await fetch(segment.key.uri, fetchOptions);
				const keyArrayBuffer = await keyResponse.arrayBuffer();
				this.key = Buffer.from(keyArrayBuffer);
			}

			const segmentUriFile = segment.uri.split("/").pop() || "";
			const file = segmentUriFile.match(/(.*?)\?/)?.[1] || segmentUriFile;

			const split = link.split("/");
			const salt = (Math.random() + 1).toString(36).substring(7);
			chunks.push({
				name: `${salt}_${split[4]}_${split[5]}_${file}`,
				url: this.normalizeUri(segment.uri, this.root),
				method: segment.key ? segment.key.method : "NONE"
			});
		}

		return chunks;
	}

	private async decrypt(chunk: { url: string; method: string }): Promise<Buffer> {
		const result = await (async () => {
			if (chunk.method === "AES-128") {
				const response = await fetch(chunk.url, fetchOptions);
				const cipheredArrayBuffer = await response.arrayBuffer();
				const cipheredData = Buffer.from(cipheredArrayBuffer);
				const iv = cipheredData.slice(0, 16);
				const encryptedData = cipheredData.slice(16);
				const decipher = crypto.createDecipheriv("aes-128-cbc", this.key!, iv);

				return Buffer.concat([
					decipher.update(encryptedData),
					decipher.final()
				]);
			} else {
				const response = await fetch(chunk.url, fetchOptions);
				const arrayBuffer = await response.arrayBuffer();
				return Buffer.from(arrayBuffer);
			}
		})().catch(async (err: NodeJS.ErrnoException) => {
			if (err.code === "ECONNRESET" || err.code === "ETIMEDOUT") {
				return await this.decrypt(chunk);
			}
			throw err;
		});

		return result;
	}

	private async downloadCover(): Promise<string> {
		const albumThumb = typeof this.audio.album === "object" && this.audio.album !== null && !Array.isArray(this.audio.album) && "thumb" in this.audio.album
			? this.audio.album.thumb
			: undefined;

		if (!this.audio.coverUrl_p && !albumThumb) {
			return "";
		}

		const cover = albumThumb
			? (albumThumb.photo_1200 || albumThumb.photo_600)
			: this.audio.coverUrl_p;

		if (!cover) {
			return "";
		}

		const pathToCover = path.resolve(this.params.chunks, `${this.audio.id}.jpg`);
		const stream = fs.createWriteStream(pathToCover);

		return new Promise(async (resolve) => {
			stream.once("finish", () => resolve(pathToCover));

			const response = await fetch(cover, fetchOptions);
			return response.body.pipe(stream);
		});
	}

	private metadata(): Array<[string, string]> {
		return [
			["artist", this.audio.performer || this.audio.artist || ""],
			["title", this.audio.title],
			["album", typeof this.audio.album === "object" && this.audio.album && "title" in this.audio.album ? this.audio.album.title || "" : ""],
			["encoded_by", "Meridius"],
			...this.params.metadata
		];
	}

	private async downloadM3U8(): Promise<string | Buffer> {
		const [chunks, cover] = await Bluebird.all([
			this.parse(this.audio.url),
			this.downloadCover()
		]);

		if (chunks.length === 0) {
			throw new Error("Chunks are empty");
		}

		let downloaded = 0;
		await Bluebird.map(chunks, async (chunk) => {
			const data = await this.decrypt(chunk);

			if (data) {
				chunk.url = path.join(this.params.chunks, chunk.name);
				fs.writeFileSync(chunk.url, data, { encoding: "binary" });
				downloaded++;
			}

			return this.params.onProgress((downloaded / chunks.length) * 100);
		}, { concurrency: this.params.concurrency });

		this.params.onProcessing();

		if (!this.params.name) {
			this.params.name = chunks[0].name;
		}

		this.params.name = filenamify(this.params.name);

		const output = path.join(this.params.output, (this.params.name + ".mp3").replace(".ts.mp3", ".mp3"));

		const listName = "list_" + filenamify(this.params.name.replaceAll(" ", "_")) + ".txt";
		const listFile = path.join(this.params.chunks, listName);

		const lines = "ffconcat version 1.0\n" + chunks.map(chunk => {
			return `file '${chunk.url}'`;
		}).join("\n") + "\n";

		await fs.writeFile(listFile, lines);

		const result = await new Promise<string | Buffer>((resolve, reject) => {
			const ffmpegInstance = ffmpeg(listFile)
				.inputFormat(ffmpegConfig.format)
				.addInputOption(ffmpegConfig.options)
				.audioCodec(ffmpegConfig.codec)
				.audioBitrate(ffmpegConfig.bitrate);

			for (const [key, value] of this.metadata()) {
				ffmpegInstance.outputOptions("-metadata", `${key}=${value}`);
			}

			ffmpegInstance.once("error", reject);
			ffmpegInstance.once("end", async () => {
				if (!this.params.delete) {
					return resolve(output);
				}

				const content = await fs.readFile(output);
				await fs.remove(output);
				return resolve(content);
			});

			if (cover) {
				ffmpegInstance
					.addInput(cover)
					.addOptions(ffmpegConfig.coverOptions)
					.videoCodec("copy");
			}

			ffmpegInstance.saveToFile(output);
		});

		await fs.remove(this.params.chunks);

		return result;
	}

	private async downloadMP3(): Promise<string | Buffer> {
		this.params.name = filenamify(this.params.name || `${this.audio.performer} - ${this.audio.title}`);
		const output = path.join(this.params.output, this.params.name + ".mp3");
		const response = await fetch(this.audio.url, fetchOptions);

		const contentLength = response.headers.get("content-length");
		const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;

		const arrayBuffer = await response.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		if (totalBytes > 0) {
			this.params.onProgress(100);
		}

		fs.writeFileSync(output, buffer, "binary");

		return new Promise((resolve) => {
			if (this.params.delete) {
				resolve(buffer);
				return fs.remove(output);
			}

			return resolve(output);
		});
	}

	public async download(): Promise<string | Buffer> {
		const link = this.audio.url.replace("&long_chunk=1", "");
		const extension = link.split(/[#?]/)[0].split(".").pop()?.trim();

		return extension !== "mp3"
			? await this.downloadM3U8()
			: await this.downloadMP3();
	}
}

