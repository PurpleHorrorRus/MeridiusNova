<template>
	<div class="lyrics-modal">
		<div class="modal-header">
			<h2 class="modal-title">Текст песни</h2>
		</div>

		<div class="modal-content">
			<div v-if="loading" class="loading-container">
				<LoadingSpinner />
			</div>

			<div v-else-if="lyricsText.length > 0" class="lyrics-content" ref="lyricsRef">
				<div
					v-for="(line, index) in lyricsText"
					:key="index"
					class="lyrics-line"
					:class="{
						active: canTrack && trackActive === index,
						seekable: canTrack
					}"
					@click="handleSeek(line)"
				>
					{{ formatLine(line) }}
				</div>
			</div>

			<div v-else class="no-lyrics">
				Текст песни недоступен
			</div>

			<div v-if="lyricsInfo?.credits" class="lyrics-credits">
				{{ lyricsInfo.credits }}
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from "vue";
import type { TAudio, TLyrics } from "~~/server/utils/types";
import { useAudioActions } from "~/composables/useAudioActions";
import { useModal } from "~/composables/useModal";
import { usePlayerStore } from "~/stores/player";
import { storeToRefs } from "pinia";
import LoadingSpinner from "~/components/LoadingSpinner.vue";

const props = defineProps<{
	audio: TAudio;
}>();

const { getLyrics } = useAudioActions();
const { closeModal } = useModal();
const playerStore = usePlayerStore();
const { song: currentSong, currentTime } = storeToRefs(playerStore);

const loading = ref(true);
const lyricsInfo = ref<TLyrics | null>(null);
const lyricsText = ref<Array<string | { line: string; begin: number }>>([]);
const trackActive = ref(-1);
const trackEnabled = ref(true);
const lyricsRef = ref<HTMLDivElement | null>(null);

const canTrack = computed(() => {
	return trackEnabled.value
		&& lyricsInfo.value?.lyrics
		&& "timestamps" in (lyricsInfo.value.lyrics || {})
		&& currentSong.value?.full_id === props.audio.full_id;
});

const formatLine = (line: string | { line: string; begin: number }): string => {
	return typeof line === "string" ? line : line.line;
};

onMounted(async () => {
	loading.value = true;

	const result = await getLyrics(props.audio).catch(() => null);
	
	if (result) {
		lyricsInfo.value = result;
		
		if (result.lyrics.timestamps) {
			lyricsText.value = result.lyrics.timestamps.filter((timestamp: any) => Boolean(timestamp.line));
		} else if (result.lyrics.text) {
			lyricsText.value = result.lyrics.text.filter((line: string) => Boolean(line));
		} else if (result.lyrics.ugc) {
			lyricsText.value = result.lyrics.ugc.split("<br>").map((line: string) => line.trim()).filter(Boolean);
		}
	}

	loading.value = false;

	if (canTrack.value) {
		await nextTick();
		updateTrack();
	}
});

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

const updateTrack = () => {
	if (!canTrack.value || lyricsText.value.length === 0) {
		return;
	}

	const currentTimeMs = currentTime.value * 1000;
	const timestamps = lyricsText.value as Array<{ line: string; begin: number }>;

	if (timestamps.length === 0) {
		return;
	}

	if (currentTimeMs < timestamps[0].begin) {
		trackActive.value = -1;
	} else if (currentTimeMs > timestamps[timestamps.length - 1].begin) {
		trackActive.value = timestamps.length - 1;
	} else {
		const index = timestamps.findIndex((timestamp) => timestamp.begin > currentTimeMs);
		trackActive.value = index > 0 ? index - 1 : 0;
	}
};

const scrollToActive = () => {
	if (!lyricsRef.value || trackActive.value < 0) {
		return;
	}

	const lines = lyricsRef.value.querySelectorAll(".lyrics-line");
	if (lines[trackActive.value]) {
		lines[trackActive.value].scrollIntoView({
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
</script>

<style scoped lang="scss">
.lyrics-modal {
	display: flex;
	flex-direction: column;
	height: 100%;
	padding: 24px;
}

.modal-header {
	margin-bottom: 24px;
}

.modal-title {
	font-size: 24px;
	font-weight: 700;
	color: var(--text, #fff);
	margin: 0;
}

.modal-content {
	flex: 1;
	display: flex;
	flex-direction: column;
	overflow-y: auto;
}

.loading-container {
	display: flex;
	align-items: center;
	justify-content: center;
	flex: 1;
}

.lyrics-content {
	display: flex;
	flex-direction: column;
	gap: 8px;
	padding: 16px;
}

.lyrics-line {
	font-size: 16px;
	line-height: 1.6;
	color: var(--text-secondary, #b3b3b3);
	transition: all 0.2s;
	padding: 8px 12px;
	border-radius: 6px;

	&.seekable {
		cursor: pointer;

		&:hover {
			background: var(--bg-hover, #2a2a2a);
		}
	}

	&.active {
		color: var(--text, #fff);
		background: var(--bg-hover, #2a2a2a);
		font-weight: 500;
	}
}

.no-lyrics {
	display: flex;
	align-items: center;
	justify-content: center;
	flex: 1;
	color: var(--text-secondary, #b3b3b3);
	font-size: 16px;
}

.lyrics-credits {
	margin-top: 16px;
	padding: 16px;
	border-top: 1px solid var(--border, #282828);
	color: var(--text-secondary, #b3b3b3);
	font-size: 14px;
	text-align: center;
}
</style>

