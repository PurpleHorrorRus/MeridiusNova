import Hls from "hls.js";
import { storeToRefs } from "pinia";
import * as lodash from "lodash";

import { useDiscordStore } from "./discord";
import { usePlaylistStore } from "./playlist";
import { useSettingsStore } from "./settings";
import { useStreamerStore } from "./streamer";
import { CrossFade } from "./player/nodes/crossfade";
import { Normalizer } from "./player/nodes/normalizer";

import { isMobileCheck } from "~/composables/useIsMobile";
import { authenticatedFetch } from "~/utils/api";

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
let debouncedSaveVolume: ((volume: number) => void) | null = null;
let lastBroadcastTime = 0;

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
		isQueueDrawerOpen: boolean;
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
		audioContext: null,
		isQueueDrawerOpen: false
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

				// Disconnect equalizer for this controller
				if (controllerData.sourceNode && import.meta.client) {
					import("~/stores/equalizer").then(({ useEqualizerStore }) => {
						const equalizerStore = useEqualizerStore();
						equalizerStore.disconnect(controllerData.sourceNode!);
					});
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

			if (actualSongs.length === 0) {
				return null;
			}

			if (playlistStore.repeat && !args.manual) {
				return this.song;
			}

		const currentIndex = playlistStore.currentIndex;

		if (playlistStore.shuffle) {
			// При включенном shuffle очередь уже перемешана, переходим к следующему треку по порядку
			if (playlistStore.hasNext) {
				// Ищем следующий доступный трек напрямую
				for (let i = currentIndex + 1; i < actualSongs.length; i++) {
					const song = actualSongs[i];
					if (song && !song.is_restriction) {
						playlistStore.setCurrentIndex(i);
						return song;
					}
				}
			}
			// Если дошли до конца и включен repeat, переходим к началу
			if (playlistStore.repeat) {
				for (let i = 0; i < currentIndex; i++) {
					const song = actualSongs[i];
					if (song && !song.is_restriction) {
						playlistStore.setCurrentIndex(i);
						return song;
					}
				}
			}
			return null;
		} else if (playlistStore.hasNext) {
				// Ищем следующий доступный трек напрямую
				for (let i = currentIndex + 1; i < actualSongs.length; i++) {
					const song = actualSongs[i];
					if (song && !song.is_restriction) {
						playlistStore.setCurrentIndex(i);
						return song;
					}
				}
				return null;
			} else if (currentIndex === actualSongs.length - 1 && playlistStore.playlistMore) {
				if (await playlistStore.loadMoreTracks()) {
					return this.getNextSong(args);
				}
			}

			// Fallback: wrap around if repeat
			if (playlistStore.repeat) {
				// Ищем первый доступный трек напрямую
				for (let i = 0; i < actualSongs.length; i++) {
					const song = actualSongs[i];
					if (song && !song.is_restriction) {
						playlistStore.setCurrentIndex(i);
						return song;
					}
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

			const settingsStore = useSettingsStore();
			const crossfadeConfig = settingsStore.settings.player.crossfade;

		if (song.clear && this.song && !(song.crossfade && crossfadeConfig.enable)) {
			await this.stop({ clearServerState: false });
		}

		// Гарантируем, что full_id всегда установлен
		const songWithFullId = {
			...song,
			full_id: song.full_id || `${song.owner_id}_${song.id}`
		};

		this.song = songWithFullId;
		this.currentTime = 0;

			// Sync playlist index
			// При manual переключении не синхронизируем индекс, так как он уже установлен в next()
			// Синхронизируем только если индекс не установлен или трек не найден по текущему индексу
			if (!song.manual || usePlaylistStore().currentIndex < 0) {
				const playlistStore = usePlaylistStore();
				const currentSong = playlistStore.currentSong;
				if (!currentSong || currentSong.full_id !== song.full_id) {
					// Используем поле _index из трека для быстрого доступа
					const songWithIndex = song as TAudio & { _index?: number };
					if (songWithIndex._index !== undefined && songWithIndex._index >= 0 && songWithIndex._index < playlistStore.playingSongs.length) {
						playlistStore.setCurrentIndex(songWithIndex._index);
					} else {
						// Fallback: ищем через findIndex если _index не установлен
						const foundIndex = playlistStore.playingSongs.findIndex((s: TAudio) => s.full_id === song.full_id);
						if (foundIndex >= 0) {
							playlistStore.setCurrentIndex(foundIndex);
						}
					}
				}
			}

			if (!this.audioContext) {
				await this.initPlayer();
			}

			if (!song.url) {
				// Fetch URL if missing using new endpoint
				const fullId = `${song.owner_id}_${song.id}`;
				const urlResponse = await authenticatedFetch<Record<string, string>>(`/api/vk/audio/url`, {
					params: {
						ids: fullId
					}
				}).catch((error: Error) => {
					console.error("Failed to fetch audio URL:", error);
					this.error = "Failed to fetch audio URL";
					this.loading = false;
					return null;
				});

				if (!urlResponse) {
					return false;
				}

				const url = urlResponse[fullId];

			if (url) {
				song.url = url;
				// Update the song object with the fetched URL
				this.song = {
					...song,
					full_id: song.full_id || `${song.owner_id}_${song.id}`
				};
			} else {
					this.error = "Failed to fetch audio URL";
					this.loading = false;
					return false;
				}
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

			// Streamer Mode
			if (import.meta.client) {
				const streamerStore = useStreamerStore();
				const settingsStore = useSettingsStore();
				const streamerEnabled = settingsStore.settings.general.streamer.enable;

				if (streamerEnabled) {
					if (!streamerStore.initialized) {
						await streamerStore.init();
					}

					streamerStore.write(song).catch((error) => {
						console.error("[Streamer Mode]: Failed to write song info", error);
					});
				}

				if (settingsStore.settings.server.enable) {
					$fetch("/api/streamer/now-playing", {
						method: "POST",
						body: {
							song: this.song,
							playlist: usePlaylistStore().playingSongs,
							paused: false
						}
					}).catch(() => {});
				}
			}

			this.loading = false;
			this.init = true;
			return true;
		},

		async loadController(song: TAudio & { crossfade?: boolean }, index: number) {
			const settingsStore = useSettingsStore();
			const crossfadeConfig = settingsStore.settings.player.crossfade;
			const normalizerConfig = settingsStore.settings.player.normalizer;

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

			// Equalizer setup - must be before crossfade to work correctly
			if (import.meta.client) {
				const { useEqualizerStore } = await import("~/stores/equalizer");
				const equalizerStore = useEqualizerStore();

				if (equalizerStore.enabled && controllerData.sourceNode && controllerData.gainNode && this.audioContext) {
					equalizerStore.connect(controllerData.sourceNode, this.audioContext, controllerData.gainNode);
				} else if (controllerData.sourceNode && controllerData.gainNode) {
					// If equalizer is disabled, connect sourceNode directly to gainNode
					controllerData.sourceNode.connect(controllerData.gainNode);
				}
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
						await this.play(Object.assign(nextSong, { manual: false }));
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

					const now = Date.now();
					if (now - lastBroadcastTime >= 1000 && useSettingsStore().settings.server.enable) {
						lastBroadcastTime = now;
						const duration = this.duration || controllerData.controller?.duration || 0;
						const currentTime = controllerData.controller?.currentTime || 0;
						$fetch("/api/streamer/now-playing", {
							method: "POST",
							body: { currentTime, duration }
						}).catch(() => {});
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

			const calculatedVolume = this.calculateVolume(this.volume, settingsStore.settings.player.volumeDivider);
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
			this.paused = true;

			const current = this.getCurrentController();
			if (current?.controller) {
				current.controller.pause();
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

			if (import.meta.client && useSettingsStore().settings.server.enable) {
				const playlistStore = usePlaylistStore();
				$fetch("/api/streamer/now-playing", {
					method: "POST",
					body: {
						song: this.song,
						playlist: playlistStore.playingSongs,
						paused: true
					}
				}).catch(() => {});
			}
		},

		resume() {
			this.paused = false;

			if (contextTimeout) clearTimeout(contextTimeout);

			if (this.audioContext && this.audioContext.state === "suspended") {
				this.audioContext.resume();
			}

			const current = this.getCurrentController();
			if (current?.controller) {
				current.controller.play();
			}

			const opposed = this.getOpposedController();
			if (opposed?.controller) {
				opposed.controller.play();
			}

			if (navigator.mediaSession) navigator.mediaSession.playbackState = "playing";

			if (import.meta.client && useSettingsStore().settings.server.enable) {
				const playlistStore = usePlaylistStore();
				$fetch("/api/streamer/now-playing", {
					method: "POST",
					body: {
						song: this.song,
						playlist: playlistStore.playingSongs,
						paused: false
					}
				}).catch(() => {});
			}

			return true;
		},

		toggle() {
			if (this.paused) {
				this.resume();
			} else {
				this.pause();
			}
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
			const playlistStore = usePlaylistStore();
			const playing = playlistStore.playing;
			const isVkMix = playing && (playing.playlist_id === -9 || String(playing.owner_id) === "vkmix");
			
			if (isVkMix) {
				const result = await $fetch<{ song: TAudio; sectionId: string }>("/api/vk/explore/vkmix", {
					params: playlistStore.vkMixSectionId ? { sectionId: playlistStore.vkMixSectionId } : {}
				}).catch(() => null);
				
				if (result?.song) {
					playlistStore.setVkMixSectionId(result.sectionId);
					
					if (!playing || (playing.playlist_id !== -9 && String(playing.owner_id) !== "vkmix")) {
						const { useStrings } = await import("~/composables/useStrings");
						const { getString } = useStrings();
						playlistStore.setPlaying({
							owner_id: 0,
							playlist_id: -9,
							raw_id: "vkmix_-9",
							title: getString("queue.source.vkMix"),
							cover_url: "",
							description: "",
							size: 0,
							listens: 0,
							last_updated: 0,
							explicit: false,
							followed: false,
							official: false,
							restricted: false,
							access_hash: "",
							follow_hash: "",
							edit_hash: "",
							list: []
						});
					}
					
					playlistStore.addSong(result.song);
					playlistStore.next();
					
					if (playlistStore.playing) {
						playlistStore.playing.list = playlistStore.playingSongs;
					}
					
					const nextSong = playlistStore.currentSong;
					if (nextSong) {
						await this.play(Object.assign(nextSong, { clear: true, manual: true }));
					}
				}
			} else if (playlistStore.playingSongs.length > 0) {
				const currentIndexBefore = playlistStore.currentIndex;
				playlistStore.next();
				const nextSong = playlistStore.currentSong;
				const currentIndexAfter = playlistStore.currentIndex;

				if (nextSong && currentIndexAfter !== currentIndexBefore && currentIndexAfter >= 0) {
					const current = playlistStore.current;
					const playingPlaylist = playlistStore.playing;
					const from = (current && playingPlaylist && current.raw_id === playingPlaylist.raw_id) ? playingPlaylist : "queue";
					await this.play(Object.assign(nextSong, { from, clear: true, manual: true }));
				}
			}
		},

		async prev(options?: { forceSwitch?: boolean }) {
			const playlistStore = usePlaylistStore();

			if (!options?.forceSwitch && this.currentTime > 3) {
				this.seek(0);
				return;
			}

			if (playlistStore.playingSongs.length > 0) {
				await playlistStore.previous();
				const prevSong = playlistStore.currentSong;

				if (prevSong) {
					await this.play(Object.assign(prevSong, { clear: true, manual: true }));
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

			const settingsStore = useSettingsStore();
			const volumeDivider = settingsStore.settings.player.volumeDivider;
			const calculatedVolume = this.calculateVolume(this.volume, volumeDivider);

			const update = (c: ControllerData | null) => {
				if (c?.controller) {
					c.controller.volume = this.muted ? 0 : calculatedVolume;
				}
			};

			update(this.getCurrentController());
			update(this.getOpposedController());

			if (!debouncedSaveVolume) {
				debouncedSaveVolume = lodash.debounce(async (volumeValue: number) => {
					const currentSettingsStore = useSettingsStore();
					await currentSettingsStore.updateSection("player", { volume: volumeValue });
				}, 500);
			}

			debouncedSaveVolume(this.volume);
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

			await useSettingsStore().updateSection("player", { mute: this.muted }, true);
		},

		async setPlaybackRate(rate: number) {
			this.playbackRate = Math.max(0.25, Math.min(4, rate));

			const update = (c: ControllerData | null) => {
				if (c?.controller) c.controller.playbackRate = this.playbackRate;
				c?.crossfadeInstance?.setPlaybackRate(this.playbackRate);
			};

			update(this.getCurrentController());
			update(this.getOpposedController());

			await useSettingsStore().updateSection("player", { playbackRate: this.playbackRate });
		},

		stop(options?: { clearServerState?: boolean }) {
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

			const clearServer = options?.clearServerState !== false;
			if (clearServer && import.meta.client && useSettingsStore().settings.server.enable) {
				$fetch("/api/streamer/now-playing", {
					method: "POST",
					body: { song: null, playlist: [], paused: true }
				}).catch(() => {});
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
		},

		formatTime(seconds: number): string {
			if (!isFinite(seconds) || isNaN(seconds)) {
				return "0:00";
			}

			const mins = Math.floor(seconds / 60);
			const secs = Math.floor(seconds % 60);
			return `${mins}:${secs.toString().padStart(2, "0")}`;
		},

		openQueueDrawer() {
			this.isQueueDrawerOpen = true;
		},

		closeQueueDrawer() {
			this.isQueueDrawerOpen = false;
		},

		toggleQueueDrawer() {
			this.isQueueDrawerOpen = !this.isQueueDrawerOpen;
		}
	}
});
