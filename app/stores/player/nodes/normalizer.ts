import Hls from "hls.js";
import type { TAudio } from "~~/server/api/vk/audio/types";

interface NormalizerConfig {
	max: number;
	enable: boolean;
}

interface SegmentData {
	frag: {
		start: number;
		end: number;
	};
	data: ArrayBuffer;
	normalized: boolean;
	gainData?: {
		gain: number;
		averageDb: number;
		boost: number;
	};
}

export class Normalizer {
	private soundNode: HTMLAudioElement;
	private audio: HTMLAudioElement;
	private duration: number;
	private gainNode: GainNode | null = null;
	private hls: Hls;
	private config: NormalizerConfig;
	private crossfade: any;
	private song: TAudio;
	private gained: SegmentData[] = [];
	private connected: boolean = false;
	private normalized: boolean = false;
	private lastGain: number = 0;
	private audioContext: AudioContext;

	constructor(
		soundNode: HTMLAudioElement,
		audioContext: AudioContext,
		gainNode: GainNode | null,
		hls: Hls,
		config: NormalizerConfig,
		crossfade: any,
		song: TAudio
	) {
		this.soundNode = soundNode;
		this.audio = soundNode;
		this.duration = soundNode.duration || 0;
		this.gainNode = gainNode;
		this.hls = hls;
		this.config = config;
		this.crossfade = crossfade;
		this.song = song;
		this.audioContext = audioContext;
		this.max = config.max;
		this.min = 1;
		this.maxDb = 1 + (config.max / 10);
		this.lastGain = 0;
	}

	private max: number;
	private min: number;
	private maxDb: number;

	connect(): Normalizer {
		if (this.connected || !this.config.enable) {
			return this;
		}

		this.hls.once(Hls.Events.BUFFER_EOS, async () => {
			this.normalized = true;
		});

		this.hls.on(Hls.Events.BUFFER_APPENDING, async (_: any, segment: SegmentData) => {
			if (segment.data.byteLength > 10000 && this.gainNode !== null) {
				segment.normalized = false;
				segment = await this.normalizeSegment(segment);
				this.gained.push(segment);
			}
		});

		this.connected = true;
		return this;
	}

	disconnect(): Normalizer {
		if (!this.connected) {
			return this;
		}

		if (this.gainNode) {
			this.gainNode.gain.cancelScheduledValues(this.audioContext.currentTime);
		}

		this.gained = [];
		this.hls.off(Hls.Events.BUFFER_EOS);
		this.hls.off(Hls.Events.BUFFER_APPENDING);

		this.normalized = false;
		this.connected = false;
		return this;
	}

	async onSeek(): Promise<boolean> {
		const segments = this.gained.filter(segment => {
			return segment.frag.end > this.audio.currentTime;
		});

		if (segments.length === 0 || this.checkBlocked(segments[0])) {
			return false;
		}

		if (this.gainNode) {
			this.gainNode.gain.cancelScheduledValues(this.audioContext.currentTime);
		}

		for (let segment of segments) {
			segment.normalized = false;
			segment = await this.normalizeSegment(segment);
		}

		return true;
	}

	private async normalizeSegment(segment: SegmentData): Promise<SegmentData> {
		if (segment.normalized) {
			return segment;
		}

		if (this.checkBlocked(segment)) {
			segment.normalized = true;
			return segment;
		}

		segment.gainData = segment.gainData || await this.calculateGain(segment.data);
		this.lastGain = segment.gainData.gain;

		const calculatedTime = this.playerTime <= segment.frag.start
			? (segment.frag.start - this.playerTime)
			: 0;

		const time = this.audioContext.currentTime + calculatedTime;

		if (this.gainNode) {
			this.gainNode.gain.linearRampToValueAtTime(segment.gainData.gain, time);
		}

		segment.normalized = true;
		return segment;
	}

	private async calculatePeaks(data: ArrayBuffer): Promise<number[]> {
		const buffer = data.slice(0);
		const decodedData = await this.audioContext.decodeAudioData(buffer);
		const decodedBuffer = decodedData.getChannelData(0);
		const sliceLen = Math.floor(decodedData.sampleRate * 0.05);

		const peaks: number[] = [];
		for (let i = 0, sum = 0; i < decodedBuffer.length / 2; i++) {
			sum += decodedBuffer[i] ** 2;

			if (i % sliceLen === 0) {
				peaks.push(Math.sqrt(sum / sliceLen));
				sum = 0;
			}
		}

		return peaks.filter(value => value > 0);
	}

	private async calculateGain(data: ArrayBuffer): Promise<{
		gain: number;
		averageDb: number;
		boost: number;
	}> {
		const peaks = await this.calculatePeaks(data);
		if (peaks.length === 0) {
			return {
				gain: this.lastGain,
				averageDb: 0,
				boost: 0
			};
		}

		const average = peaks.reduce((acc, value) => acc + value, 0) / peaks.length;
		const averageDb = Number((average * 10).toFixed(2));
		const gainData = this.calculateIncrease(averageDb);

		return {
			gain: Number((gainData.gain).toFixed(1)),
			averageDb,
			...gainData
		};
	}

	private calculateIncrease(averageDb: number): {
		gain: number;
		boost: number;
	} {
		let boost = this.maxDb;

		if (averageDb <= 1) {
			boost = Number(((1 - averageDb) * 10).toFixed(2));
			boost = Math.max(boost, this.maxDb);
			boost = Math.min(boost, this.max);
		}

		return {
			gain: Math.min(Math.max((this.max + (this.max - averageDb)) * boost, this.min), this.max),
			boost
		};
	}

	private checkBlocked(segment: SegmentData): boolean {
		const hasCrossfade = Boolean(this.song.crossfade);
		const crossfadeDuration = this.crossfade?.duration || 0;
		const isStartBlocked = hasCrossfade && Math.floor(segment.frag.start) < crossfadeDuration;
		const isEndBlocked = this.duration - Math.floor(segment.frag.end) <= (this.crossfade?.enable ? crossfadeDuration : 10);

		return isStartBlocked || isEndBlocked;
	}

	private get playerTime(): number {
		return this.audio.currentTime;
	}
}
