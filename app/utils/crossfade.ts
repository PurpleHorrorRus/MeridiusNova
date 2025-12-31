const minGain = -1;
const defaultGain = 0;

type CrossFadeConfig = {
	enable: boolean;
	duration: number;
	fade: boolean;
};

type NormalizerConfig = {
	enable: boolean;
	max: number;
};

export class CrossFade {
	private audio: HTMLAudioElement;
	private gainNode: GainNode;
	private crossfade: CrossFadeConfig;
	private normalizer: NormalizerConfig;
	private audioContext: AudioContext;
	private sourceNode: MediaElementAudioSourceNode | null = null;

	private state: number = 0;
	private increased: boolean = false;
	private decreased: boolean = false;
	private stopped: boolean = false;
	private passStart: boolean = false;

	private duration: number = 0;
	private transition: boolean = false;
	private playbackRate: number = 1;

	public onStartFinish: () => boolean | void = () => false;
	public onEnd: () => boolean | void = () => false;

	constructor(
		audio: HTMLAudioElement,
		audioContext: AudioContext,
		gainNode: GainNode,
		crossfade: CrossFadeConfig,
		normalizer: NormalizerConfig
	) {
		this.audio = audio;
		this.audioContext = audioContext;
		this.gainNode = gainNode;
		this.crossfade = crossfade;
		this.normalizer = normalizer;
	}

	start(): this {
		this.gainNode.gain.value = this.transition && this.crossfade.fade
			? minGain
			: defaultGain;

		this.audio.addEventListener("timeupdate", () => this.updateGains());
		return this;
	}

	stop(): void {
		this.stopped = true;
		this.state = 0;
	}

	updateGains(): boolean {
		if (this.audio.paused || this.stopped) {
			return false;
		}

		if (this.state === 1 && !this.passStart && this.audio.currentTime >= this.duration && !this.isEnd) {
			this.state = 0;
			this.passStart = true;
			return this.onStartFinish() !== false;
		}

		if (!this.increased && this.state === 0 && this.transition && this.isStart) {
			this.state = 1;
			this.increased = true;

			if (this.crossfade.fade) {
				const multiplier = this.normalizer.enable
					? this.normalizer.max
					: defaultGain;

				const map = new Array(this.duration + 1).fill(0).map((_, x) => ([
					(x / this.duration) * Math.max(multiplier, 1) - 1,
					this.audioContext.currentTime + (x / this.playbackRate)
				]));

				map.forEach(([gain, time]) => {
					this.gainNode.gain.linearRampToValueAtTime(gain, time);
				});
			}

			return true;
		}

		if (!this.decreased && this.isEnd) {
			this.state = 2;
			this.decreased = true;

			if (this.crossfade.fade) {
				const multiplier = this.normalizer.enable
					? this.gainNode.gain.value
					: defaultGain;

				const start = this.duration - (this.audio.duration - this.audio.currentTime);
				const length = Math.ceil(this.duration - start);
				const step = (1 / length) * length;

				const map = new Array(length + 1).fill(0).map((_, index) => {
					return start + (step * index);
				}).map((x, index) => ([
					-Math.sqrt((x - start) / (this.duration - start)) * (multiplier + 1) + multiplier,
					this.audioContext.currentTime + ((step * index) / this.playbackRate)
				]));

				this.gainNode.gain.cancelScheduledValues(map[0][1]);
				map.forEach(([gain, time]) => {
					this.gainNode.gain.linearRampToValueAtTime(gain, time);
				});
			}

			return this.onEnd() !== false;
		}

		return true;
	}

	onSeek(): void {
		this.state = 0;
		this.passStart = true;
		this.increased = true;
	}

	setDuration(duration: number): number {
		this.duration = Math.min(Math.max(duration, 2), 14);
		return this.duration;
	}

	get startTime(): number {
		return this.duration;
	}

	get contextStartTime(): number {
		return this.audioContext.currentTime
			+ (this.startTime / this.playbackRate);
	}

	get isStart(): boolean {
		return this.audio.currentTime <= this.startTime;
	}

	get endTime(): number {
		return this.audio.duration - this.duration;
	}

	get contextEndTime(): number {
		return this.audioContext.currentTime
			+ ((this.audio.duration - this.audio.currentTime) / this.playbackRate);
	}

	get isEnd(): boolean {
		return this.audio.currentTime >= this.endTime;
	}
}

