export const withAudioGuard = <T extends any[]>(
	audio: T[0] | null,
	callback: (audio: NonNullable<T[0]>) => void | Promise<void>
): void | Promise<void> => {
	if (!audio) {
		return;
	}
	return callback(audio as NonNullable<T[0]>);
};

