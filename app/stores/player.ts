import Hls from "hls.js";

import { CrossFade } from "./player/nodes/crossfade";
import { Normalizer } from "./player/nodes/normalizer";
import { useDiscordStore } from "./discord";
import { usePlaylistStore } from "./playlist";
import { isMobileCheck } from "~/composables/useIsMobile";

import type { TAudio } from "~~/server/api/vk/audio/types";
import type { TPlayerState } from "~~/server/utils/types";

interface ControllerData {
	controller: HTMLAudioElement | null;
	hls: Hls | null;
	sourceNode: MediaElementAudioSourceNode | null;
	gainNode: GainNode | null;
	crossfadeInstance: CrossFade | null;
	normalizerInstance: Normalizer | null;
	endedHandler: ((event: Event) => void) | null;
	timeUpdateHandler: ((event: Event) => void) | null;
	loadedMetadataHandler: ((event: Event) => void) | null;
}

const controllers: [ControllerData | null, ControllerData | null] = [null, null];
let controllerIndex = -1;
let opposedControllerIndex = -1;
let contextTimeout: NodeJS.Timeout | null = null;

const emptySong: TAudio = {
	id: -1,
	owner_id: -1,
	full_id: "-1_-1",
	title: "Сейчас ничего не играет",
	performer: "Meridius",
	duration: 0,
	url: "",
	cover: ""
};

export const usePlayerStore = defineStore("player", {
	state: (): TPlayerState & {
		song: TAudio | null;
		init: boolean;
		created: boolean;
		emptySong: TAudio;
		muted: boolean;
		previousVolume: number;
		audioContext: AudioContext | null;
	} => ({
		init: false,
		created: false,
		song: null,
		emptySong: Object.freeze(emptySong),
		paused: true,
		currentTime: 0,
		duration: 0,
		volume: 0.5,
		playbackRate: 1,
		loading: false,
		error: null,
		muted: false,
		previousVolume: 0.5,
		audioContext: null
	}),

	getters: {
		isPlaying: (state) => {
			return !state.paused && state.song !== null;
		},

		progress: (state) => {
			if (state.duration === 0) {
				return 0;
			}

			return (state.currentTime / state.duration) * 100;
		},

		currentController(): ControllerData | null {
			return controllerIndex >= 0
				? controllers[controllerIndex] ?? null
				: null;
		},

		opposedController(): ControllerData | null {
			return opposedControllerIndex >= 0
				? controllers[opposedControllerIndex] ?? null
				: null;
		}
	},

	actions: {
		// Helper to access controllers without getters (since controllerIndex is local)
		getCurrentController(): ControllerData | null {
			return controllerIndex >= 0
				? controllers[controllerIndex] ?? null
				: null;
		},

		getOpposedController(): ControllerData | null {
			return opposedControllerIndex >= 0
				? controllers[opposedControllerIndex] ?? null
				: null;
		},

	async initPlayer() {
		if (this.created) {
			return false;
		}

		if (import.meta.client) {
			const isMobile = isMobileCheck();
			this.volume = isMobile ? 1.0 : (this.volume || 0.5);
		} else {
			this.volume = this.volume || 0.5;
		}

		if (import.meta.client) {
			const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
			this.audioContext = new AudioContext();
			this.audioContext.suspend();
		}

		this.created = true;

		return true;
	},

		resetController(index: number): boolean {
			const controllerData = controllers[index];

			if (controllerData) {
				if (controllerData.controller) {
					controllerData.controller.pause();

					if (controllerData.endedHandler) {
						controllerData.controller.removeEventListener("ended", controllerData.endedHandler);
					}

					if (controllerData.timeUpdateHandler) {
						controllerData.controller.removeEventListener("timeupdate", controllerData.timeUpdateHandler);
					}

					if (controllerData.loadedMetadataHandler) {
						controllerData.controller.removeEventListener("loadedmetadata", controllerData.loadedMetadataHandler);
					}
				}

				if (controllerData.normalizerInstance) {
					controllerData.normalizerInstance.disconnect();
				}

				if (controllerData.hls) {
					controllerData.hls.destroy();
				}

				if (controllerData.sourceNode) {
					controllerData.sourceNode.disconnect();
				}

				if (controllerData.gainNode) {
					controllerData.gainNode.disconnect();
				}

				if (controllerData.crossfadeInstance) {
					controllerData.crossfadeInstance.stop();
				}

				controllers[index] = null;
				return true;
			}

			return false;
		},

		abortCrossfade(index: number): boolean {
			return this.resetController(index)
				|| controllers[index]?.crossfadeInstance?.state === 0;
		},

		async getNextSong(args: { manual?: boolean } = {}): Promise<TAudio | null> {
			const playlistStore = usePlaylistStore();
			const actualSongs = playlistStore.playingSongs;
			const actualRepeat = playlistStore.repeat;
			const actualShuffle = playlistStore.shuffle;
			const actualHasNext = playlistStore.hasNext;
			const currentIndex = playlistStore.currentIndex;
			const isLastTrack = currentIndex === actualSongs.length - 1;

			if (actualSongs.length === 0) {
				return null;
			}

			// If repeat is enabled and not manual switch, return current song (handled in caller usually, but logic here)
			// Actually old logic: if repeat && !manual -> return state.song. 
			// But here getNextSong is called usually when track ends or explicitly next.
			// Let's follow the standard logic:

			if (actualRepeat && !args.manual) {
				return this.song;
			}

			if (actualShuffle) {
				const nonRestrictedSongs = actualSongs.filter((s: TAudio, idx: number) => !s.is_restriction && idx !== currentIndex);
				if (nonRestrictedSongs.length > 0) {
					const randomSong = nonRestrictedSongs[Math.floor(Math.random() * nonRestrictedSongs.length)];

					if (randomSong) {
						const newIndex = actualSongs.findIndex((s: TAudio) => s.full_id === randomSong.full_id);

						if (newIndex >= 0) {
							playlistStore.setCurrentIndex(newIndex);
							return randomSong;
						}
					}
				}
			} else if (actualHasNext) {
				// Try to find next non-restricted song
				for (let i = currentIndex + 1; i < actualSongs.length; i++) {
					const potentialSong = actualSongs[i];
					if (potentialSong && !potentialSong.is_restriction) {
						playlistStore.setCurrentIndex(i);
						return potentialSong;
					}
				}

				return null;
			} else if (isLastTrack && playlistStore.playlistMore) {
				const newTracks = await playlistStore.loadMoreTracks();

				if (newTracks && newTracks.length > 0) {
					const newIndex = actualSongs.length; // Before push it was length, now it's index of first new
					// Actually loadMoreTracks updates state.
					// We need to find the first new non-restricted song.
					// Assuming loadMoreTracks appends.
					// Let's just re-check actualSongs logic.
					return this.getNextSong(args); // Recursion risk but logically sound if loadMore works
				}
			}

			// Fallback: wrap around if repeat was handled differently or just end of playlist logic
			if (actualRepeat) {
				// If repeat is on but manual, or we exhausted list, find first non-restricted
				const firstNonRestricted = actualSongs.find((s: TAudio) => !s.is_restriction);

				if (firstNonRestricted) {
					const firstIndex = actualSongs.findIndex((s: TAudio) => s.full_id === firstNonRestricted.full_id);
					playlistStore.setCurrentIndex(firstIndex);
					return firstNonRestricted;
				}
			}

			return null;
		},

		async play(song: TAudio & { crossfade?: boolean; clear?: boolean; manual?: boolean }) {
			if (!song || song.is_restriction) {
				return false;
			}

			// If current song is same and paused -> resume (но не при manual переключении)
			const isSameSong = this.song?.full_id === song.full_id;
			if (isSameSong && this.paused && !song.manual) {
				return this.resume();
			}

			if (this.loading) {
				return false;
			}

			this.loading = true;
			this.error = null;

			// Don't call stop() during crossfade - let previous track fade out smoothly
			// Get crossfade config to check if crossfade is enabled
			const { useSettings } = await import("~/composables/useSettings");
			const { settings } = useSettings();
			const crossfadeConfig = settings.value.player.crossfade;

			if (song.clear && this.song && !(song.crossfade && crossfadeConfig.enable)) {
				await this.stop();
			}

			this.song = { ...song };
			this.currentTime = 0;

			// Sync playlist index
			const playlistStore = usePlaylistStore();
			// При manual переключении не синхронизируем индекс, так как он уже установлен в next()
			// Синхронизируем только если индекс не установлен или трек не найден по текущему индексу
			if (!song.manual || playlistStore.currentIndex < 0) {
				const currentSong = playlistStore.currentSong;
				if (!currentSong || currentSong.full_id !== song.full_id) {
					const songIndex = playlistStore.playingSongs.findIndex((s: TAudio) => s.full_id === song.full_id);
					if (songIndex >= 0) {
						playlistStore.setCurrentIndex(songIndex);
					}
				}
			}

			if (!this.audioContext) {
				await this.initPlayer();
			}

			if (!song.url) {
				// Fetch URL if missing (simplified here, assuming caller provides or we might need fetch logic)
				// In old project: dispatch("requests/FETCH_URL", song)
				this.error = "URL not available";
				this.loading = false;
				return false;
			}

			if (this.audioContext) {
				if (this.audioContext.state === "suspended") {
					await this.audioContext.resume();
				}
			}

			// Logic from CREATE_PLAYER
			controllerIndex = controllerIndex < 0 ? 0 : opposedControllerIndex;
			opposedControllerIndex = Number(!controllerIndex);

			// Check manual flag
			if (song.manual && !song.crossfade) {
				// Reset both controllers immediately to stop previous track
				this.resetController(controllerIndex);
				this.resetController(opposedControllerIndex);
			}

			// Logic from LOAD
			await this.loadController(song, controllerIndex);

			// Logic from CREATE_PLAYER continued
			const currentControllerData = controllers[controllerIndex];

			if (currentControllerData?.controller) {
				currentControllerData.controller.play();
				this.paused = false;
			}

			// Setup Metadata
			this.initMetadata(song);

			// Discord RPC
			if (import.meta.client) {
				const discordStore = useDiscordStore();
				discordStore.setActivity(song);
			}

			this.loading = false;
			this.init = true;
			return true;
		},

		async loadController(song: TAudio & { crossfade?: boolean }, index: number) {
			const { useSettings } = await import("~/composables/useSettings");
			const { settings } = useSettings();
			// IMPORTANT: Force refresh of settings or ensure reactivity?
			// Settings should be reactive.
			const crossfadeConfig = { ...settings.value.player.crossfade };
			const normalizerConfig = settings.value.player.normalizer;
			const equalizerConfig = settings.value.equalizer;

			const controllerData: ControllerData = {
				controller: new Audio(),
				hls: null,
				sourceNode: null,
				gainNode: null,
				crossfadeInstance: null,
				normalizerInstance: null,
				endedHandler: null,
				timeUpdateHandler: null,
				loadedMetadataHandler: null
			};

			if (!this.audioContext) {
				return;
			}

			controllerData.gainNode = this.audioContext.createGain();
			controllerData.gainNode.connect(this.audioContext.destination);

			controllerData.sourceNode = this.audioContext.createMediaElementSource(controllerData.controller!);
			controllerData.sourceNode.connect(controllerData.gainNode);

			// Setup HLS first as Normalizer needs it
			if (Hls.isSupported()) {
				controllerData.hls = new Hls({
					maxBufferLength: 10,
					maxMaxBufferLength: 20,
					startLevel: -1,
					capLevelToPlayerSize: false,
					lowLatencyMode: false,
					backBufferLength: 0
				});

				controllerData.hls.attachMedia(controllerData.controller!);
				controllerData.hls.loadSource(song.url);
			} else {
				controllerData.controller!.src = song.url;
			}

			// Crossfade setup
			if (crossfadeConfig.enable) {
				controllerData.crossfadeInstance = new CrossFade(
					controllerData.controller!,
					this.audioContext,
					controllerData.gainNode,
					crossfadeConfig,
					normalizerConfig
				);

				if (song.crossfade) {
					controllerData.crossfadeInstance.setTransition(true);
				}

				controllerData.crossfadeInstance.setPlaybackRate(this.playbackRate);

				controllerData.crossfadeInstance.setOnStartFinish(() => {
					this.abortCrossfade(opposedControllerIndex);
				});

				controllerData.crossfadeInstance.setOnEnd(async () => {
					this.resetController(opposedControllerIndex);

					// Stop listening to events for this controller
					if (controllerData.timeUpdateHandler && controllerData.controller) {
						controllerData.controller.removeEventListener("timeupdate", controllerData.timeUpdateHandler);
					}
					if (controllerData.endedHandler && controllerData.controller) {
						controllerData.controller.removeEventListener("ended", controllerData.endedHandler);
					}

					this.currentTime = 0;

					// We trigger next song immediately.
					const nextSong = await this.getNextSong();
					if (nextSong) {
						await this.play({
							...nextSong,
							crossfade: true,
							clear: false,
							manual: false
						});
					}
				});

				controllerData.crossfadeInstance.start();
			} else {
				controllerData.gainNode.gain.value = 1;
			}

			// Normalizer setup
			if (normalizerConfig.enable && controllerData.hls) {
				controllerData.normalizerInstance = new Normalizer(
					controllerData.controller!,
					this.audioContext,
					controllerData.gainNode,
					controllerData.hls,
					normalizerConfig,
					crossfadeConfig,
					song
				);

				controllerData.normalizerInstance.connect();
			}

			// Handlers
			controllerData.endedHandler = async () => {
				if (navigator.mediaSession) navigator.mediaSession.metadata = null;

				const isCrossfadeActive = controllerData.crossfadeInstance !== null && controllerData.crossfadeInstance.state !== 0;

				if (!isCrossfadeActive && song.full_id === this.song?.full_id) {
					if (usePlaylistStore().repeat) {
						this.currentTime = 0;

						if (controllerData.controller) {
							controllerData.controller.currentTime = 0;
							controllerData.controller.play();
						}

						return;
					}

					await this.resetController(index);
					const nextSong = await this.getNextSong();

					if (nextSong) {
						await this.play({ ...nextSong, manual: false });
					} else {
						this.stop();
					}
				} else {
					await this.resetController(index);
				}
			};

			controllerData.timeUpdateHandler = () => {
				if (this.paused || !this.song || this.song.full_id !== song.full_id) return;

				// Only update time if not fading out
				if (controllerData.crossfadeInstance?.state !== 2) {
					this.currentTime = controllerData.controller?.currentTime || 0;

					if (navigator.mediaSession) {
						const duration = this.duration || controllerData.controller?.duration || 0;
						const position = controllerData.controller?.currentTime || 0;
						const playbackRate = controllerData.controller?.playbackRate || 1;

						if (duration > 0 && !isNaN(duration) && isFinite(duration) && !isNaN(position) && isFinite(position)) {
							navigator.mediaSession.setPositionState({
								duration: duration,
								playbackRate: playbackRate,
								position: position
							});
						}
					}
				}
			};

			controllerData.loadedMetadataHandler = () => {
				const duration = controllerData.controller?.duration ?? 0;
				this.duration = duration;

				if (navigator.mediaSession && duration > 0 && !isNaN(duration) && isFinite(duration)) {
					const position = controllerData.controller?.currentTime || 0;
					const playbackRate = controllerData.controller?.playbackRate || 1;

					if (!isNaN(position) && isFinite(position)) {
						navigator.mediaSession.setPositionState({
							duration: duration,
							playbackRate: playbackRate,
							position: position
						});
					}
				}
			};

			controllerData.controller!.addEventListener("ended", controllerData.endedHandler);
			controllerData.controller!.addEventListener("timeupdate", controllerData.timeUpdateHandler);
			controllerData.controller!.addEventListener("loadedmetadata", controllerData.loadedMetadataHandler);

			const calculatedVolume = this.calculateVolume(this.volume, settings.value.player.volumeDivider);
			controllerData.controller!.volume = this.muted ? 0 : calculatedVolume;
			controllerData.controller!.playbackRate = this.playbackRate;

			controllers[index] = controllerData;
		},

		initMetadata(song: TAudio) {
			if (!("mediaSession" in navigator)) return;

			navigator.mediaSession.metadata = new MediaMetadata({
				title: song.title,
				artist: song.performer,
				artwork: [{ src: song.cover || "", type: "image/png" }]
			});

			navigator.mediaSession.setActionHandler("play", () => this.resume());
			navigator.mediaSession.setActionHandler("pause", () => this.pause());
			navigator.mediaSession.setActionHandler("previoustrack", () => this.prev());
			navigator.mediaSession.setActionHandler("nexttrack", () => this.next({ manual: true }));
			navigator.mediaSession.setActionHandler("stop", () => this.stop());
		},

		pause() {
			const current = this.getCurrentController();
			if (current?.controller) {
				current.controller.pause();
				this.paused = true;
			}

			const opposed = this.getOpposedController();
			if (opposed?.controller) {
				opposed.controller.pause();
			}

			if (this.audioContext && this.audioContext.state === "running") {
				if (contextTimeout) clearTimeout(contextTimeout);
				contextTimeout = setTimeout(() => {
					this.audioContext?.suspend();
				}, 30000);
			}

			if (navigator.mediaSession) navigator.mediaSession.playbackState = "paused";
		},

		resume() {
			if (contextTimeout) clearTimeout(contextTimeout);

			if (this.audioContext && this.audioContext.state === "suspended") {
				this.audioContext.resume();
			}

			const current = this.getCurrentController();
			if (current?.controller) {
				current.controller.play();
				this.paused = false;
			}

			const opposed = this.getOpposedController();
			if (opposed?.controller) {
				opposed.controller.play();
			}

			if (navigator.mediaSession) navigator.mediaSession.playbackState = "playing";
			return true;
		},

		toggle() {
			this.paused ? this.resume() : this.pause();
		},

		seek(time: number) {
			const current = this.getCurrentController();
			if (current?.controller) {
				current.controller.currentTime = time;
				this.currentTime = time;
				current.crossfadeInstance?.onSeek();
				current.normalizerInstance?.onSeek();

				if (navigator.mediaSession) {
					const duration = this.duration || current.controller.duration || 0;
					const playbackRate = current.controller.playbackRate || 1;

					if (duration > 0 && !isNaN(duration) && isFinite(duration) && !isNaN(time) && isFinite(time)) {
						navigator.mediaSession.setPositionState({
							duration: duration,
							playbackRate: playbackRate,
							position: time
						});
					}
				}
			}
		},

		async next(args: { manual?: boolean } = {}) {
			const nextSong = await this.getNextSong(args);
			if (nextSong) {
				await this.play({ ...nextSong, manual: args.manual, clear: args.manual });
			}
		},

		async prev() {
			const playlistStore = usePlaylistStore();

			if (this.currentTime > 3) { // Seek to 0 if > 3s
				this.seek(0);
				return;
			}

			// Всегда пытаемся переключиться, если есть треки в плейлисте
			// Метод previous() сам обработает repeat и shuffle
			if (playlistStore.playingSongs.length > 0) {
				await playlistStore.previous();
				const prevSong = playlistStore.currentSong;

				if (prevSong) {
					await this.play({ ...prevSong, clear: true, manual: true });
				}
			}
		},

		calculateVolume(volume: number, divider: number): number {
			const calculated = volume / divider;
			return Number(Math.max(0, Math.min(1, calculated)).toFixed(3));
		},

	async setVolume(volume: number) {
		if (import.meta.client) {
			const isMobile = isMobileCheck();
			if (isMobile) {
				this.volume = 1.0;
			} else {
				this.volume = Math.max(0, Math.min(1, volume));
			}
		} else {
			this.volume = Math.max(0, Math.min(1, volume));
		}

		if (!this.muted) {
			this.previousVolume = this.volume;
		}

		const { useSettings } = await import("~/composables/useSettings");
		const { settings } = useSettings();
		const volumeDivider = settings.value.player.volumeDivider;
		const calculatedVolume = this.calculateVolume(this.volume, volumeDivider);

		const update = (c: ControllerData | null) => {
			if (c?.controller) {
				c.controller.volume = this.muted ? 0 : calculatedVolume;
			}
		};

		update(this.getCurrentController());
		update(this.getOpposedController());
	},

	async toggleMute() {
		if (this.muted) {
			// Включаем звук - восстанавливаем предыдущую громкость
			this.muted = false;
			await this.setVolume(this.previousVolume);
		} else {
			// Выключаем звук - сохраняем текущую громкость и устанавливаем 0
			this.previousVolume = this.volume;
			this.muted = true;
			await this.setVolume(0);
		}
	},

		setPlaybackRate(rate: number) {
			this.playbackRate = Math.max(0.25, Math.min(4, rate));

			const update = (c: ControllerData | null) => {
				if (c?.controller) c.controller.playbackRate = this.playbackRate;
				c?.crossfadeInstance?.setPlaybackRate(this.playbackRate);
			};

			update(this.getCurrentController());
			update(this.getOpposedController());
		},

		stop() {
			this.resetController(0);
			this.resetController(1);
			controllerIndex = -1;
			opposedControllerIndex = -1;
			this.paused = true;
			this.currentTime = 0;
			this.song = null;

			if (navigator.mediaSession) {
				navigator.mediaSession.metadata = null;
				navigator.mediaSession.playbackState = "none";
			}
		},

		destroy() {
			this.stop();
			this.created = false;
			this.init = false;

			if (this.audioContext) {
				this.audioContext.close();
				this.audioContext = null;
			}
		}
	}
});
