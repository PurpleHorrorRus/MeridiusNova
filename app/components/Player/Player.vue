<template>
	<div class="player-wrapper" v-if="currentSong">
		<div 
			class="player" 
			:class="{ 'fullscreen': isFullscreen }" 
			@click="handlePlayerClick"
			@touchstart="handlePlayerTouchStart"
			@touchmove="handlePlayerTouchMove"
			@touchend="handlePlayerTouchEnd"
		>
			<PlayerTimeline />
			<PlayerLeft :is-fullscreen="isFullscreen" @toggle-fullscreen="toggleFullscreen" />
			<PlayerCenter />
			<PlayerRight />
			<PlayerCompact />
		</div>
		
		<FullscreenPlayer 
			:is-fullscreen="isFullscreen" 
			@toggle-fullscreen="toggleFullscreen"
		/>
	</div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { useEventListener } from "~/composables/useEventListener";
import { storeToRefs } from "pinia";
import { useAudio } from "~/composables/useAudio";
import { usePlaylistStore } from "~/stores/playlist";
import { usePlayerStore } from "~/stores/player";
import { provideSongsContext } from "~/composables/useSongsContext";
import { isMobileCheck } from "~/composables/useIsMobile";
import PlayerTimeline from "~/components/Player/PlayerTimeline.vue";
import PlayerLeft from "~/components/Player/PlayerLeft.vue";
import PlayerCenter from "~/components/Player/PlayerCenter.vue";
import PlayerRight from "~/components/Player/PlayerRight.vue";
import PlayerCompact from "~/components/Player/PlayerCompact.vue";
import FullscreenPlayer from "~/components/Player/FullscreenPlayer.vue";

const { currentSong } = useAudio();

const playlistStore = usePlaylistStore();
const playerStore = usePlayerStore();

// Provide the songs context before useUpdateTrack to fix the injection warning
// Используем storeToRefs для сохранения реактивности
const { playingSongs } = storeToRefs(playlistStore);
provideSongsContext(playingSongs);

const isFullscreen = ref(false);

// Touch events for swipe
let touchStartY = 0;
let touchStartX = 0;
let touchStartTime = 0;
const SWIPE_THRESHOLD = 50;
const SWIPE_VELOCITY_THRESHOLD = 0.3;

const handlePlayerClick = (event: MouseEvent) => {
	// Не открываем полноэкранный режим на мобильных устройствах
	if (isMobileCheck()) {
		return;
	}

	const target = event.target as HTMLElement;
	
	// Не открываем полноэкранный режим, если клик был на кнопку или timeline
	const isButton = target.closest("button");
	const isTimeline = target.closest(".player-timeline");
	
	if (isButton || isTimeline) {
		return;
	}
	
	// Открываем полноэкранный режим по клику на плеер
	if (!isFullscreen.value) {
		event.stopPropagation();
		toggleFullscreen();
	}
};

const handlePlayerTouchStart = (event: TouchEvent) => {
	if (event.touches.length === 1 && !isFullscreen.value) {
		const touch = event.touches[0];
		if (touch) {
			touchStartY = touch.clientY;
			touchStartX = touch.clientX;
			touchStartTime = Date.now();
		}
	}
};

const handlePlayerTouchMove = (event: TouchEvent) => {
	// Предотвращаем скролл страницы при свайпе
	if (event.touches.length === 1 && !isFullscreen.value) {
		const touch = event.touches[0];
		if (touch) {
			const touchY = touch.clientY;
			const deltaY = touchStartY - touchY;
			
			// Если свайп вверх, предотвращаем скролл
			if (deltaY > 0) {
				event.preventDefault();
			}
		}
	}
};

const handlePlayerTouchEnd = (event: TouchEvent) => {
	if (event.changedTouches.length === 1 && !isFullscreen.value) {
		const touch = event.changedTouches[0];
		if (touch) {
			const touchEndY = touch.clientY;
			const touchEndTime = Date.now();
			const deltaY = touchStartY - touchEndY;
			const deltaTime = touchEndTime - touchStartTime;
			const velocity = deltaTime > 0 ? Math.abs(deltaY) / deltaTime : 0;
			
			// Проверяем, что это свайп снизу вверх с достаточной дистанцией и скоростью
			const isSwipeUp = deltaY > SWIPE_THRESHOLD;
			const isFastEnough = velocity > SWIPE_VELOCITY_THRESHOLD || deltaY > SWIPE_THRESHOLD * 2;
			
			// Проверяем, что клик не был на кнопку или timeline
			const target = event.target as HTMLElement;
			const isInteractiveElement = target.closest("button") || target.closest(".player-timeline");
			
			if (isSwipeUp && isFastEnough && !isInteractiveElement) {
				toggleFullscreen();
			}
		}
	}
	
	touchStartY = 0;
	touchStartX = 0;
	touchStartTime = 0;
};

const toggleFullscreen = () => {
	isFullscreen.value = !isFullscreen.value;
	
	if (isFullscreen.value) {
		document.body.style.overflow = "hidden";
	} else {
		document.body.style.overflow = "";
	}
};

const handleEscapeKey = (event: KeyboardEvent) => {
	if (event.key === "Escape" && isFullscreen.value) {
		toggleFullscreen();
	}
};

const handleSpaceKey = (event: KeyboardEvent) => {
	if (event.key === " " || event.key === "Spacebar") {
		const target = event.target as HTMLElement;
		const isInputElement = target.tagName === "INPUT" || 
			target.tagName === "TEXTAREA" || 
			target.isContentEditable;

		if (!isInputElement && currentSong.value) {
			event.preventDefault();
			playerStore.toggle();
		}
	}
};

useEventListener(document, "keydown", handleEscapeKey);
useEventListener(document, "keydown", handleSpaceKey);

onUnmounted(() => {
	document.body.style.overflow = "";
});
</script>

<style scoped lang="scss">
.player-wrapper {
	position: fixed;
	bottom: 24px;
	left: 256px;
	right: 24px;
	z-index: 1000;
	display: flex;
	flex-direction: column;

	@media (max-width: 1400px) {
		left: 216px;
	}

	@media (max-width: 1200px) {
		left: 196px;
	}

	@media (max-width: 1000px) {
		left: 176px;
	}

	@media (max-width: 800px) {
		left: 196px;
		right: 12px;
		bottom: 12px;
	}

	@media (max-width: 700px) {
		left: 176px;
		right: 8px;
		bottom: 8px;
	}

	@media (max-width: 600px) {
		left: 96px;
		right: 4px;
		bottom: 4px;
	}

	@media (max-width: 480px) {
		left: 8px;
		right: 8px;
		bottom: 8px;
	}
}

.player {
	position: relative;
	height: 96px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 0 24px;
	gap: 20px;
	background: rgba(22, 22, 22, 0.7);
	backdrop-filter: blur(25px) saturate(180%);
	-webkit-backdrop-filter: blur(25px) saturate(180%);
	border: 1px solid rgba(255, 255, 255, 0.08);
	border-radius: 20px;
	box-shadow: 
		0 20px 40px -10px rgba(0, 0, 0, 0.5),
		0 0 0 1px rgba(255, 255, 255, 0.05) inset;
	transition: all 0.3s ease;
	touch-action: pan-y;
	
	@media (max-width: 800px) {
		cursor: pointer;
		user-select: none;
		-webkit-user-select: none;
	}

	@media (max-width: 1400px) {
		padding: 0 16px;
		gap: 12px;
		height: 92px;
	}

	@media (max-width: 1200px) {
		padding: 0 12px;
		gap: 8px;
		height: 88px;
	}

	@media (max-width: 1000px) {
		padding: 0 8px;
		gap: 6px;
		height: 84px;
		border-radius: 16px;
	}

	@media (max-width: 800px) {
		padding: 0 6px;
		gap: 4px;
		height: 80px;
		border-radius: 16px;
	}

	@media (min-width: 801px) and (max-width: 1000px) {
		border-radius: 16px;
	}

	@media (max-width: 700px) {
		padding: 0 4px;
		gap: 4px;
		height: 76px;
		border-radius: 12px;
	}

	@media (max-width: 600px) {
		padding: 0 4px;
		gap: 4px;
		height: 72px;
		border-radius: 12px;
	}
}

@media (max-width: 480px) {
	.player-wrapper {
		left: 0;
		right: 0;
		bottom: 0;
		border-radius: 0;
	}

	.player {
		border-radius: 0;
		border-left: none;
		border-right: none;
		border-bottom: none;
	}
}
</style>
