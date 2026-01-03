interface CrossfadeConfig {
	enable: boolean;
	duration: number;
	fade: boolean;
};

const minGain = 0;
const defaultGain = 1;

export class CrossFade {
	private audio: HTMLAudioElement;
	private gainNode: GainNode;
	private crossfade: CrossfadeConfig;
	private normalizer: any;

	public state: number = 0;
	public increased: boolean = false;
	public decreased: boolean = false;
	public stopped: boolean = false;
	public passStart: boolean = false;
	public transition: boolean = false;

	private duration: number = 0;
	private playbackRate: number = 1;
	private audioContext: AudioContext;

	private onStartFinishCallback: () => void = () => { };
	private onEndCallback: () => void = () => { };
	private timeUpdateHandler: (() => void) | null = null;

	constructor(
		soundNode: HTMLAudioElement,
		audioContext: AudioContext,
		gainNode: GainNode,
		crossfade: CrossfadeConfig,
		normalizer: any
	) {
		this.audio = soundNode;
		this.gainNode = gainNode;
		this.crossfade = crossfade;
		this.normalizer = normalizer;
		this.audioContext = audioContext;

		this.duration = 0;
		this.transition = false;

		this.setDuration(crossfade.duration);
	}

	start(): CrossFade {
		this.gainNode.gain.value = this.transition && this.crossfade.fade
			? minGain
			: defaultGain;

		this.timeUpdateHandler = () => this.updateGains();
		this.audio.addEventListener("timeupdate", this.timeUpdateHandler);

		return this;
	}

	stop(): void {
		this.stopped = true;
		this.state = 0;

		if (this.timeUpdateHandler) {
			this.audio.removeEventListener("timeupdate", this.timeUpdateHandler);
			this.timeUpdateHandler = null;
		}
	}

	updateGains(): boolean | void {
		if (this.audio.paused || this.stopped) {
			return false;
		}

		// Fade-in finished
		if (this.state === 1 && !this.passStart && this.audio.currentTime >= this.duration && !this.isEnd) {
			this.state = 0;
			this.passStart = true;
			return this.onStartFinishCallback();
		}

		// Fade-in start
		if (!this.increased && this.state === 0 && this.transition && this.isStart) {
			this.state = 1;
			this.increased = true;

			if (this.crossfade.fade) {
				const multiplier = this.normalizer?.enable
					? this.normalizer.max
					: defaultGain;

				// Calculate ramp points
				const map = new Array(this.duration + 1).fill(0).map((_, x) => ([
					minGain + (x / this.duration) * (multiplier - minGain),
					this.audioContext.currentTime + (x / this.playbackRate)
				] as [number, number]));

				for (const [gain, time] of map) {
					this.gainNode.gain.linearRampToValueAtTime(gain, time);
				}
			}

			return true;
		}

		// Fade-out start
		if (!this.decreased && this.isEnd) {
			this.state = 2;
			this.decreased = true;

			if (this.crossfade.fade) {
				// Use current gain as starting point for smoothness?
				// Actually, we want to fade out from CURRENT value to 0.
				const currentGain = this.gainNode.gain.value;

				const start = this.duration - (this.audio.duration - this.audio.currentTime);
				const length = Math.ceil(this.duration - start);

				// Ensure length is positive and valid
				if (length <= 0) {
					return this.onEndCallback();
				}

				const step = (1 / length) * length;

				const map = new Array(length + 1).fill(0).map((_, index) => {
					return start + (step * index);
				}).map((_x, index) => ([
					currentGain * (1 - (index / length)),
					this.audioContext.currentTime + ((step * index) / this.playbackRate)
				]) as [number, number]);

				if (map.length > 0 && map[0]) {
					// Cancel scheduled values slightly before first ramp point to ensure clean start
					this.gainNode.gain.cancelScheduledValues(this.audioContext.currentTime);
					this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, this.audioContext.currentTime);

					for (const [gain, time] of map) {
						this.gainNode.gain.linearRampToValueAtTime(gain, time);
					}
				}
			}

			return this.onEndCallback();
		}

		return true;
	}

	onSeek(): void {
		this.state = 0;
		this.passStart = true;
		this.increased = true;
	}

	setDuration(duration: number): number {
		this.duration = Math.min(Math.max(duration, 2), 16);
		return this.duration;
	}

	setTransition(transition: boolean): void {
		this.transition = transition;
	}

	setPlaybackRate(rate: number): void {
		this.playbackRate = rate;
	}

	setOnStartFinish(callback: () => void): void {
		this.onStartFinishCallback = callback;
	}

	setOnEnd(callback: () => void): void {
		this.onEndCallback = callback;
	}

	get startTime(): number {
		return this.duration;
	}

	get contextStartTime(): number {
		return this.audioContext.currentTime + (this.startTime / this.playbackRate);
	}

	get isStart(): boolean {
		return this.audio.currentTime <= this.startTime;
	}

	get endTime(): number {
		if (!this.audio.duration || isNaN(this.audio.duration)) {
			return 0;
		}

		return this.audio.duration - this.duration;
	}

	get contextEndTime(): number {

		if (!this.audio.duration || isNaN(this.audio.duration)) {
			return this.audioContext.currentTime;
		}

		return this.audioContext.currentTime + ((this.audio.duration - this.audio.currentTime) / this.playbackRate);
	}

	get isEnd(): boolean {
		if (!this.audio.duration || isNaN(this.audio.duration)) {
			return false;
		}

		return this.audio.currentTime >= this.endTime;
	}
}
