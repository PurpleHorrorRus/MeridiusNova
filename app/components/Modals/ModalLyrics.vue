<template>
	<div class="lyrics-modal">
		<div class="modal-header">
			<h2 class="modal-title" v-html="audio.title"></h2>
			<button class="modal-close-btn" @click="closeModal">
				<Icon name="mdi:close" size="24" />
			</button>
		</div>

		<div class="modal-content" :ref="lyrics.lyricsRef">
			<div v-if="isLoading" class="loading-container">
				<LoadingSpinner />
			</div>

			<div v-else-if="lyricsText.length > 0" class="lyrics-content">
				<div
					v-for="(line, index) in lyricsText"
					:key="index"
					:ref="el => { if (el) lyrics.lyricsLineRefs.value[index] = el as HTMLElement; }"
					class="lyrics-line"
					:class="{
						active: canTrack && trackActive === index,
						seekable: canTrack && hasTimestamp(line)
					}"
					@click="lyrics.handleSeek(line)"
				>
					<span class="lyrics-line-text">{{ lyrics.formatLine(line) }}</span>
					<span v-if="hasTimestamp(line)" class="lyrics-timestamp">
						{{ formatTimestamp(line) }}
					</span>
				</div>
			</div>

			<div v-else class="no-lyrics">
				Текст песни недоступен
			</div>

			<div v-if="lyrics.lyricsInfo.value?.credits" class="lyrics-credits">
				{{ lyrics.lyricsInfo.value.credits }}
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { onMounted, computed, watch, nextTick } from "vue";
import type { TAudio } from "~~/server/utils/types";
import { useModal } from "~/composables/useModal";
import { useLyrics } from "~/composables/useLyrics";
import LoadingSpinner from "~/components/LoadingSpinner.vue";

const props = defineProps<{
	audio: TAudio;
}>();

const { closeModal } = useModal();
const lyrics = useLyrics(() => props.audio);

const isLoading = computed(() => lyrics.loading.value);
const lyricsText = computed(() => lyrics.lyricsText.value);
const canTrack = computed(() => lyrics.canTrack.value);
const trackActive = computed(() => lyrics.trackActive.value);

const hasTimestamp = (line: string | { line: string; begin: number }): boolean => {
	return typeof line === "object" && "begin" in line;
};

const formatTimestamp = (line: string | { line: string; begin: number }): string => {
	if (typeof line === "object" && "begin" in line) {
		const seconds = Math.floor(line.begin / 1000);
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, "0")}`;
	}
	return "";
};

onMounted(async () => {
	await lyrics.loadLyrics();
	
	if (canTrack.value) {
		lyrics.trackEnabled.value = true;
		await nextTick();
		lyrics.updateTrack();
	}
});

watch(trackActive, (newValue, oldValue) => {
	if (canTrack.value && newValue >= 0 && newValue !== oldValue) {
		lyrics.trackEnabled.value = true;
		nextTick(() => {
			lyrics.scrollToActive();
		});
	}
});
</script>

<style scoped lang="scss">
.lyrics-modal {
	display: flex;
	flex-direction: column;
	height: 100%;
	padding: 24px;
	background: rgba(18, 18, 18, 0.95);
	backdrop-filter: blur(20px);
	border-radius: 12px;
	width: 100%;
	box-sizing: border-box;

	@media (max-width: 768px) {
		padding: 8px;
	}
}

.modal-header {
	margin-bottom: 24px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	position: relative;

	@media (max-width: 768px) {
		margin-bottom: 12px;
	}
}

.modal-title {
	font-size: 24px;
	font-weight: 700;
	color: var(--text, #fff);
	margin: 0;

	@media (max-width: 768px) {
		font-size: 18px;
	}
}

.modal-close-btn {
	background: rgba(255, 255, 255, 0.1);
	border: none;
	border-radius: 50%;
	width: 36px;
	height: 36px;
	display: flex;
	align-items: center;
	justify-content: center;
	color: rgba(255, 255, 255, 0.9);
	cursor: pointer;
	transition: all 0.2s ease;
	flex-shrink: 0;

	&:hover {
		background: rgba(255, 255, 255, 0.15);
		color: #fff;
	}

	&:active {
		transform: scale(0.95);
	}
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
	gap: 2px;
	padding: 12px;

	@media (max-width: 768px) {
		padding: 4px;
	}
}

.lyrics-line {
	font-size: 15px;
	line-height: 1.5;
	padding: 4px 8px;
	border-radius: 8px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	transition: color 0.2s ease;

	@media (max-width: 768px) {
		padding: 4px 4px;
		gap: 8px;
	}

	&:not(.active) {
		color: #888 !important;
	}

	&.seekable {
		cursor: pointer;

		&:hover:not(.active) {
			color: #aaa !important;
		}
	}

	&.active {
		color: #fff !important;
		font-weight: 500;
	}
}

.lyrics-timestamp {
	font-size: 11px;
	color: #666;
	font-weight: 500;
	flex-shrink: 0;
	opacity: 0.6;
	transition: opacity 0.2s ease;
	letter-spacing: 0.5px;
}

.lyrics-line.active .lyrics-timestamp {
	opacity: 0.9;
}

.lyrics-line.seekable:hover .lyrics-timestamp {
	opacity: 0.9;
}

.lyrics-line-text {
	flex: 1;
	text-align: left;
	color: inherit;
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

	@media (max-width: 768px) {
		margin-top: 8px;
		padding: 8px;
		font-size: 12px;
	}
}
</style>

