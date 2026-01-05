export const formatTime = (seconds: number): string => {
	if (!isFinite(seconds) || isNaN(seconds)) {
		return "0:00";
	}

	const mins = Math.floor(seconds / 60);
	const secs = Math.floor(seconds % 60);
	return `${mins}:${secs.toString().padStart(2, "0")}`;
};

