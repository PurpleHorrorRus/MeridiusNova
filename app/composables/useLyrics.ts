import { ref, computed, watch, nextTick, onUnmounted } from "vue";
import type { TAudio, TLyrics } from "~~/server/utils/types";
import { usePlayerStore } from "~/stores/player";
import { useAudioStore } from "~/stores/audio";
import { storeToRefs } from "pinia";

export const useLyrics = (audio: () => TAudio | null) => {
	const playerStore = usePlayerStore();
	const { song: currentSong, currentTime } = storeToRefs(playerStore);

	const loading = ref(false);
	const lyricsInfo = ref<TLyrics | null>(null);
	const lyricsText = ref<Array<string | { line: string; begin: number }>>([]);
	const trackActive = ref(-1);
	const trackEnabled = ref(true);
	const lyricsRef = ref<HTMLDivElement | null>(null);
	const lyricsLineRefs = ref<Record<number, HTMLElement>>({});

	const canTrack = computed(() => {
		const currentAudio = audio();
		return trackEnabled.value
			&& lyricsInfo.value?.lyrics
			&& "timestamps" in (lyricsInfo.value.lyrics || {})
			&& currentSong.value?.full_id === currentAudio?.full_id;
	});

	const formatLine = (line: string | { line: string; begin: number }): string => {
		return typeof line === "string" ? line : line.line;
	};

	const loadLyrics = async () => {
		const currentAudio = audio();
		if (!currentAudio) {
			return;
		}

		loading.value = true;
		lyricsInfo.value = null;
		lyricsText.value = [];
		trackActive.value = -1;

		const audioStore = useAudioStore();
		const result = await audioStore.getLyrics(currentAudio).catch(() => null);
		
		if (result) {
			lyricsInfo.value = result;
			
			if (result.lyrics?.timestamps) {
				lyricsText.value = result.lyrics.timestamps.filter((timestamp: any) => Boolean(timestamp.line));
			} else if (result.lyrics?.text) {
				lyricsText.value = result.lyrics.text.filter((line: string) => Boolean(line));
			} else if (result.lyrics?.ugc) {
				const ugc = result.lyrics.ugc;
				if (typeof ugc === "string") {
					lyricsText.value = (ugc as string).split("<br>").map((line: string) => line.trim()).filter(Boolean);
				} else if (Array.isArray(ugc)) {
					lyricsText.value = (ugc as string[]).map((line: string) => line.trim()).filter(Boolean);
				}
			}
		}

		loading.value = false;
		await nextTick();

		if (canTrack.value) {
			updateTrack();
		}
	};

	const updateTrack = () => {
		if (!canTrack.value || lyricsText.value.length === 0) {
			return;
		}

		const currentTimeMs = currentTime.value * 1000;
		const timestamps = lyricsText.value as Array<{ line: string; begin: number }>;

		if (timestamps.length === 0) {
			return;
		}

		const firstTimestamp = timestamps[0];
		const lastTimestamp = timestamps[timestamps.length - 1];

		if (!firstTimestamp || !lastTimestamp) {
			return;
		}

		if (currentTimeMs < firstTimestamp.begin) {
			trackActive.value = -1;
		} else if (currentTimeMs > lastTimestamp.begin) {
			trackActive.value = timestamps.length - 1;
		} else {
			const index = timestamps.findIndex((timestamp) => timestamp.begin > currentTimeMs);
			trackActive.value = index > 0 ? index - 1 : 0;
		}
	};

	const scrollToActive = () => {
		if (trackActive.value < 0) {
			return;
		}

		const activeLine = lyricsLineRefs.value[trackActive.value];
		if (activeLine) {
			activeLine.scrollIntoView({
				behavior: "smooth",
				block: "center"
			});
		}
	};

	const handleSeek = (line: string | { line: string; begin: number }) => {
		if (canTrack.value && typeof line === "object" && "begin" in line) {
			trackEnabled.value = true;
			playerStore.seek(Math.ceil(line.begin / 1000));
			updateTrack();
			scrollToActive();
		}
	};

	const reset = () => {
		lyricsInfo.value = null;
		lyricsText.value = [];
		trackActive.value = -1;
		loading.value = false;
	};

	watch([currentTime, currentSong], () => {
		if (canTrack.value) {
			updateTrack();
		}
	}, { deep: true });

	watch(trackActive, () => {
		if (trackEnabled.value && trackActive.value >= 0) {
			scrollToActive();
		}
	});

	return {
		loading,
		lyricsInfo,
		lyricsText,
		trackActive,
		trackEnabled,
		lyricsRef,
		lyricsLineRefs,
		canTrack,
		formatLine,
		loadLyrics,
		handleSeek,
		updateTrack,
		scrollToActive,
		reset
	};
};

