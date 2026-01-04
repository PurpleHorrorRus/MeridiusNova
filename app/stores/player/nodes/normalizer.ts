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
		rms: number;
		rmsDb: number;
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
	private song: TAudio & { crossfade?: boolean };
	private gained: SegmentData[] = [];
	private connected: boolean = false;
	private normalized: boolean = false;
	private lastGain: number = 1;
	private audioContext: AudioContext;
	private targetRmsDb: number = -16;
	private transitionDuration: number = 0.1;

	constructor(
		soundNode: HTMLAudioElement,
		audioContext: AudioContext,
		gainNode: GainNode | null,
		hls: Hls,
		config: NormalizerConfig,
		crossfade: any,
		song: TAudio & { crossfade?: boolean }
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
		this.targetRmsDb = -16 - (config.max / 2);
		this.lastGain = 1;
	}

	connect(): Normalizer {
		if (this.connected || !this.config.enable) {
			return this;
		}

		this.hls.once(Hls.Events.BUFFER_EOS, async () => {
			this.normalized = true;
		});

		this.hls.on(Hls.Events.BUFFER_APPENDING, async (_: any, data: any) => {
			const segmentData: SegmentData = {
				frag: data.frag,
				data: data.data,
				normalized: false
			};

			if (segmentData.data.byteLength > 10000 && this.gainNode !== null) {
				const normalizedSegment = await this.normalizeSegment(segmentData);
				this.gained.push(normalizedSegment);
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

		const firstSegment = segments[0];
		if (segments.length === 0 || !firstSegment || this.checkBlocked(firstSegment)) {
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

		const calculatedTime = this.playerTime <= segment.frag.start
			? (segment.frag.start - this.playerTime)
			: 0;

		const startTime = this.audioContext.currentTime + calculatedTime;
		const endTime = startTime + this.transitionDuration;

		if (this.gainNode) {
			const currentGain = this.gainNode.gain.value;
			const targetGain = segment.gainData.gain;

			if (Math.abs(currentGain - targetGain) > 0.001) {
				this.gainNode.gain.setValueAtTime(currentGain, startTime);
				this.gainNode.gain.linearRampToValueAtTime(targetGain, endTime);
			} else {
				this.gainNode.gain.setValueAtTime(targetGain, startTime);
			}
		}

		this.lastGain = segment.gainData.gain;
		segment.normalized = true;
		return segment;
	}

	private async calculateRms(data: ArrayBuffer): Promise<number> {
		const buffer = data.slice(0);
		const decodedData = await this.audioContext.decodeAudioData(buffer);
		const numberOfChannels = decodedData.numberOfChannels;
		const length = decodedData.length;

		if (length === 0) {
			return 0;
		}

		let sumOfSquares = 0;

		for (let channelIndex = 0; channelIndex < numberOfChannels; channelIndex++) {
			const channelData = decodedData.getChannelData(channelIndex);

			for (let sampleIndex = 0; sampleIndex < length; sampleIndex++) {
				const sample = channelData[sampleIndex];
				if (sample !== undefined) {
					sumOfSquares += sample * sample;
				}
			}
		}

		const meanSquare = sumOfSquares / (numberOfChannels * length);
		const rms = Math.sqrt(meanSquare);

		return rms;
	}

	private rmsToDb(rms: number): number {
		if (rms <= 0) {
			return -Infinity;
		}

		return 20 * Math.log10(rms);
	}

	private async calculateGain(data: ArrayBuffer): Promise<{
		gain: number;
		rms: number;
		rmsDb: number;
	}> {
		const rms = await this.calculateRms(data);

		if (rms <= 0) {
			return {
				gain: this.lastGain,
				rms: 0,
				rmsDb: -Infinity
			};
		}

		const rmsDb = this.rmsToDb(rms);
		const targetGainDb = this.targetRmsDb - rmsDb;
		const targetGain = Math.pow(10, targetGainDb / 20);

		const maxGain = Math.pow(10, this.config.max / 20);
		const minGain = Math.pow(10, -this.config.max / 20);
		const clampedGain = Math.max(minGain, Math.min(maxGain, targetGain));

		return {
			gain: Number(clampedGain.toFixed(4)),
			rms: Number(rms.toFixed(6)),
			rmsDb: Number(rmsDb.toFixed(2))
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

