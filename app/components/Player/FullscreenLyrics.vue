<template>
	<Transition name="lyrics-slide">
		<div v-if="showLyrics" class="fullscreen-lyrics-section">
			<div class="fullscreen-lyrics-content" :ref="lyrics.lyricsRef">
				<div v-if="lyricsLoading" class="fullscreen-lyrics-loading">
					<LoadingSpinner />
				</div>
				
				<div v-else-if="lyricsText.length > 0" class="fullscreen-lyrics-lines">
					<div
						v-for="(line, index) in lyricsText"
						:key="index"
						:ref="el => { if (el) lyrics.lyricsLineRefs.value[index] = el as HTMLElement; }"
						class="fullscreen-lyrics-line"
						:class="{
							active: canTrack && trackActive === index,
							seekable: canTrack
						}"
						@click="lyrics.handleSeek(line)"
					>
						{{ lyrics.formatLine(line) }}
					</div>
				</div>
				
				<div v-else class="fullscreen-lyrics-empty">
					Текст песни недоступен
				</div>
				
				<div v-if="lyricsInfo?.credits" class="fullscreen-lyrics-credits">
					{{ lyricsInfo.credits }}
				</div>
			</div>
		</div>
	</Transition>
</template>

<script setup lang="ts">
import { watch } from "vue";

import LoadingSpinner from "~/components/LoadingSpinner.vue";

import { useLyrics } from "~/composables/useLyrics";

import type { TAudio } from "~~/server/api/vk/audio/types";

const props = defineProps<{
	showLyrics: boolean;
	currentSong: TAudio | null;
}>();

const lyrics = useLyrics(() => props.currentSong);
const lyricsLoading = lyrics.loading;
const lyricsText = lyrics.lyricsText;
const lyricsInfo = lyrics.lyricsInfo;
const canTrack = lyrics.canTrack;
const trackActive = lyrics.trackActive;

watch(() => props.showLyrics, async (newValue) => {
	if (newValue && props.currentSong) {
		await lyrics.loadLyrics();
	} else if (!newValue) {
		lyrics.reset();
	}
});

watch(() => props.currentSong, () => {
	if (props.showLyrics) {
		lyrics.reset();
	}
});
</script>

<style scoped lang="scss">
.fullscreen-lyrics-section {
	flex: 0 0 auto;
	display: flex;
	flex-direction: column;
	width: 500px;
	max-width: 500px;
	max-height: calc(100vh - 80px);
	background: rgba(0, 0, 0, 0.3);
	border-radius: 24px;

	padding: 24px;
	overflow: hidden;
	flex-shrink: 0;
	position: relative;
	z-index: 0;

	@media (max-width: 768px) {
		width: 100%;
		max-width: 100%;
		max-height: calc(100vh - 40px);
		padding: 20px;
		border-radius: 20px;
	}

	@media (max-width: 480px) {
		width: 100%;
		max-width: 100%;
		max-height: calc(100vh - 32px);
		padding: 16px;
		border-radius: 16px;
	}
}

.fullscreen-lyrics-content {
	flex: 1;
	display: flex;
	flex-direction: column;
	overflow-y: auto;
	overflow-x: hidden;
	padding-right: 8px;

	&::-webkit-scrollbar {
		width: 6px;
	}

	&::-webkit-scrollbar-track {
		background: rgba(255, 255, 255, 0.05);
		border-radius: 3px;
	}

	&::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.2);
		border-radius: 3px;

		&:hover {
			background: rgba(255, 255, 255, 0.3);
		}
	}
}

.fullscreen-lyrics-loading {
	display: flex;
	align-items: center;
	justify-content: center;
	flex: 1;
}

.fullscreen-lyrics-lines {
	display: flex;
	flex-direction: column;
	gap: 8px;
	padding: 8px 0;
}

.fullscreen-lyrics-line {
	font-size: 16px;
	line-height: 1.6;
	color: rgba(255, 255, 255, 0.6);
	transition: background-color 0.2s ease, color 0.2s ease;
	padding: 12px 16px;
	border-radius: 8px;
	cursor: default;

	@media (max-width: 768px) {
		font-size: 15px;
		padding: 10px 14px;
	}

	@media (max-width: 480px) {
		font-size: 14px;
		padding: 8px 12px;
	}

	&.seekable {
		cursor: pointer;

		&:hover {
			background: rgba(255, 255, 255, 0.1);
			color: rgba(255, 255, 255, 0.8);
		}
	}

	&.active {
		color: #fff;
		background: rgba(255, 255, 255, 0.15);
		font-weight: 500;
	}
}

.fullscreen-lyrics-empty {
	display: flex;
	align-items: center;
	justify-content: center;
	flex: 1;
	color: rgba(255, 255, 255, 0.5);
	font-size: 16px;
	text-align: center;

	@media (max-width: 768px) {
		font-size: 14px;
	}
}

.fullscreen-lyrics-credits {
	margin-top: 20px;
	padding-top: 16px;
	border-top: 1px solid rgba(255, 255, 255, 0.1);
	color: rgba(255, 255, 255, 0.5);
	font-size: 13px;
	text-align: center;
	line-height: 1.5;

	@media (max-width: 768px) {
		margin-top: 16px;
		padding-top: 12px;
		font-size: 12px;
	}
}

.lyrics-slide-enter-active {
	animation: lyricsSlideIn 0.4s ease;
}

.lyrics-slide-leave-active {
	animation: lyricsSlideOut 0.4s ease;
}

@keyframes lyricsSlideIn {
	from {
		opacity: 0;
		transform: translateX(50px);
	}
	to {
		opacity: 1;
		transform: translateX(0);
	}
}

@keyframes lyricsSlideOut {
	from {
		opacity: 1;
		transform: translateX(0);
	}
	to {
		opacity: 0;
		transform: translateX(50px);
	}
}
</style>

