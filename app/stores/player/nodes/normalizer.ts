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
	private bufferEosHandler: (() => void) | null = null;
	private bufferAppendingHandler: ((_: any, data: any) => void) | null = null;
	private processingSegments: Set<string> = new Set();

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

		this.bufferEosHandler = async () => {
			this.normalized = true;
		};

		this.hls.once(Hls.Events.BUFFER_EOS, this.bufferEosHandler);

		this.bufferAppendingHandler = async (_: any, data: any) => {
			if (!this.connected || !this.gainNode) {
				return;
			}

			const segmentData: SegmentData = {
				frag: data.frag,
				data: this.toArrayBuffer(data.data),
				normalized: false
			};

			// Создаем уникальный ключ для сегмента
			const segmentKey = `${segmentData.frag.start}-${segmentData.frag.end}`;

			// Пропускаем, если сегмент уже обрабатывается
			if (this.processingSegments.has(segmentKey)) {
				return;
			}

			if (segmentData.data.byteLength > 10000 && this.gainNode !== null) {
				this.processingSegments.add(segmentKey);

				try {
					const normalizedSegment = await this.normalizeSegment(segmentData);
					
					// Очищаем ArrayBuffer данные после нормализации для освобождения памяти
					normalizedSegment.data = new ArrayBuffer(0);
					
					this.gained.push(normalizedSegment);
					
					// Ограничиваем размер массива - удаляем старые сегменты, которые уже прошли
					const currentTime = this.playerTime;
					const maxSegments = 50;
					
					if (this.gained.length > maxSegments) {
						// Удаляем сегменты, которые уже прошли (end < currentTime - 30 секунд)
						const cutoffTime = currentTime - 30;
						this.gained = this.gained.filter(segment => segment.frag.end >= cutoffTime);
					}
				} finally {
					this.processingSegments.delete(segmentKey);
				}
			}
		};

		this.hls.on(Hls.Events.BUFFER_APPENDING, this.bufferAppendingHandler);

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

		// Очищаем массив сегментов и освобождаем память
		this.gained.forEach(segment => {
			segment.data = new ArrayBuffer(0);
		});

		this.gained = [];
		this.processingSegments.clear();

		// Удаляем обработчики событий
		if (this.bufferEosHandler) {
			this.hls.off(Hls.Events.BUFFER_EOS, this.bufferEosHandler);
			this.bufferEosHandler = null;
		}

		if (this.bufferAppendingHandler) {
			this.hls.off(Hls.Events.BUFFER_APPENDING, this.bufferAppendingHandler);
			this.bufferAppendingHandler = null;
		}

		this.normalized = false;
		this.connected = false;
		return this;
	}

	async onSeek(): Promise<boolean> {
		const currentTime = this.audio.currentTime;
		const segments = this.gained.filter(segment => {
			return segment.frag.end > currentTime;
		});

		// Удаляем старые сегменты, которые уже прошли
		const cutoffTime = currentTime - 10;
		this.gained = this.gained.filter(segment => segment.frag.end >= cutoffTime);

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
			// Очищаем данные, если сегмент заблокирован
			segment.data = new ArrayBuffer(0);
			return segment;
		}

		// Сохраняем данные перед расчетом, так как они могут быть очищены
		const segmentData = segment.data;
		segment.gainData = segment.gainData || await this.calculateGain(segmentData);

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
		if (data.byteLength === 0) {
			return 0;
		}
		// Используем копию данных, чтобы не изменять оригинал
		const buffer = data.slice(0);
		let decodedData: AudioBuffer | null = null;

		try {
			decodedData = await this.audioContext.decodeAudioData(buffer);
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
		} finally {
			// Пытаемся освободить память - обнуляем ссылку на AudioBuffer
			// В JavaScript нет явного способа освободить AudioBuffer,
			// но обнуление ссылки поможет сборщику мусора
			if (decodedData) {
				// @ts-ignore - пытаемся очистить внутренние ссылки
				decodedData = null;
			}
		}
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

	/** HLS.js BUFFER_APPENDING передаёт data как Uint8Array; decodeAudioData требует ArrayBuffer. */
	private toArrayBuffer(data: ArrayBuffer | ArrayBufferView): ArrayBuffer {
		if (data instanceof ArrayBuffer) {
			return data;
		}
		const view = data as Uint8Array;
		const start = view.byteOffset;
		const end = start + view.byteLength;
		return view.buffer.slice(start, end);
	}
}

