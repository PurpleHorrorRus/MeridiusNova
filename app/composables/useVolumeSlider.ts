import { ref, toRefs } from "vue";
import { useAudio } from "~/composables/useAudio";
import { useSettings } from "~/composables/useSettings";

export const useVolumeSlider = () => {
	const { volume, muted, setVolume, toggleMute } = useAudio();
	
	const { settings } = useSettings();

	const volumeSliderRef = ref<HTMLElement | null>(null);
	const volumeRangeInputRef = ref<HTMLInputElement | null>(null);
	const isDraggingVolume = ref(false);
	const volumeDragHandlers = ref<{ move: (event: MouseEvent) => void; up: () => void } | null>(null);

	const handleVolumeChange = async (event: Event) => {
		const target = event.target as HTMLInputElement;
		const newVolume = Number(target.value) / 1000;
		await setVolume(newVolume);
	};

	const handleVolumeSliderMouseDown = async (event: MouseEvent) => {
		const clickedElement = event.target as HTMLElement;
		
		if (clickedElement.tagName === "INPUT") {
			const inputElement = clickedElement as HTMLInputElement;
			if (inputElement.type === "range") {
				event.stopPropagation();
				return;
			}
		}

		event.preventDefault();
		event.stopPropagation();

		const slider = volumeSliderRef.value;
		const rangeInput = volumeRangeInputRef.value;
		
		if (!slider || !rangeInput) {
			return;
		}

		const getOffsetX = (mouseEvent: MouseEvent): number => {
			const currentSliderRect = slider.getBoundingClientRect();
			return mouseEvent.clientX - currentSliderRect.left;
		};

		const offsetX = getOffsetX(event);
		const width = slider.clientWidth;
		const percentage = Math.max(0, Math.min(1, offsetX / width));
		const newValue = Math.round(percentage * 1000);
		const newVolume = newValue / 1000;
		
		rangeInput.value = String(newValue);
		await setVolume(newVolume);

		const handleMouseMove = async (moveEvent: MouseEvent) => {
			const moveOffsetX = getOffsetX(moveEvent);
			const moveWidth = slider.clientWidth;
			const movePercentage = Math.max(0, Math.min(1, moveOffsetX / moveWidth));
			const moveValue = Math.round(movePercentage * 1000);
			const moveVolume = moveValue / 1000;
			
			rangeInput.value = String(moveValue);
			await setVolume(moveVolume);
		};

		const handleMouseUp = () => {
			if (volumeDragHandlers.value) {
				document.removeEventListener("mousemove", volumeDragHandlers.value.move);
				document.removeEventListener("mouseup", volumeDragHandlers.value.up);
			}
			isDraggingVolume.value = false;
			volumeDragHandlers.value = null;
		};

		document.addEventListener("mousemove", handleMouseMove);
		document.addEventListener("mouseup", handleMouseUp);

		volumeDragHandlers.value = { move: handleMouseMove, up: handleMouseUp };
		isDraggingVolume.value = true;
	};

	const handleVolumeWheel = async (event: WheelEvent) => {
		event.preventDefault();
		event.stopPropagation();

		const hasWheelStep = settings.value
			&& settings.value.player
			&& settings.value.player.step
			&& settings.value.player.step.wheel;

		const wheelStepValue = hasWheelStep
			? settings.value.player.step.wheel
			: 1;

		const wheelStep = wheelStepValue / 100;
		const delta = event.deltaY > 0 ? -wheelStep : wheelStep;
		const newVolume = Math.max(0, Math.min(1, volume.value + delta));
		
		await setVolume(newVolume);
	};

	const toggleMuteWrapper = async () => {
		await toggleMute();
	};

	return {
		volume,
		muted,
		volumeSliderRef,
		volumeRangeInputRef,
		isDraggingVolume,
		toggleMute: toggleMuteWrapper,
		handleVolumeChange,
		handleVolumeSliderMouseDown,
		handleVolumeWheel
	};
};

