import { ref } from "vue";
import { throttle } from "lodash";
import { storeToRefs } from "pinia";
import { usePlayerStore } from "~/stores/player";

export const usePlayerTimeline = (throttleDelay: number = 150) => {
	const playerStore = usePlayerStore();
	const { duration, progress } = storeToRefs(playerStore);
	const seek = (time: number) => playerStore.seek(time);

	const throttledProgress = ref(0);
	const showTooltip = ref(false);
	const tooltipTime = ref(0);
	const tooltipPosition = ref(0);

	const updateThrottledProgress = throttle((value: number) => {
		throttledProgress.value = value;
	}, throttleDelay);

	const handleProgressClick = (event: MouseEvent) => {
		const target = event.currentTarget as HTMLElement;
		const rect = target.getBoundingClientRect();
		const x = event.clientX - rect.left;
		const percentage = x / rect.width;
		const newTime = percentage * duration.value;

		seek(newTime);
	};

	const handleProgressHover = (event: MouseEvent) => {
		const currentDuration = duration.value;
		
		if (!currentDuration || !isFinite(currentDuration) || currentDuration <= 0) {
			showTooltip.value = false;
			return;
		}

		const target = event.currentTarget as HTMLElement;
		const rect = target.getBoundingClientRect();
		const x = event.clientX - rect.left;
		const percentage = Math.max(0, Math.min(1, x / rect.width));

		tooltipTime.value = percentage * currentDuration;
		tooltipPosition.value = percentage * 100;
		showTooltip.value = true;
	};

	const handleProgressTouch = (event: TouchEvent) => {
		const target = event.currentTarget as HTMLElement;
		const rect = target.getBoundingClientRect();
		const touch = event.touches[0] || event.changedTouches[0];
		
		if (!touch) {
			return;
		}
		
		const x = touch.clientX - rect.left;
		const percentage = Math.max(0, Math.min(1, x / rect.width));
		const newTime = percentage * duration.value;

		seek(newTime);
	};

	const handleProgressTouchMove = (event: TouchEvent) => {
		const currentDuration = duration.value;
		
		if (!currentDuration || !isFinite(currentDuration) || currentDuration <= 0) {
			showTooltip.value = false;
			return;
		}

		const target = event.currentTarget as HTMLElement;
		const rect = target.getBoundingClientRect();
		const touch = event.touches[0];
		
		if (!touch) {
			return;
		}
		
		const x = touch.clientX - rect.left;
		const percentage = Math.max(0, Math.min(1, x / rect.width));

		tooltipTime.value = percentage * currentDuration;
		tooltipPosition.value = percentage * 100;
		showTooltip.value = true;
	};

	const handleProgressTouchEnd = () => {
		showTooltip.value = false;
	};

	return {
		throttledProgress,
		showTooltip,
		tooltipTime,
		tooltipPosition,
		updateThrottledProgress,
		handleProgressClick,
		handleProgressHover,
		handleProgressTouch,
		handleProgressTouchMove,
		handleProgressTouchEnd,
		formatTime: (seconds: number) => playerStore.formatTime(seconds)
	};
};

