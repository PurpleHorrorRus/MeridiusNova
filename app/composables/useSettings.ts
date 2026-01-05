import { storeToRefs } from "pinia";
import { useSettingsStore } from "~/stores/settings";
import type { TSettings } from "~~/server/utils/types";

export const useSettings = () => {
	const settingsStore = useSettingsStore();

	const { settings, loaded } = storeToRefs(settingsStore);

	const load = () => settingsStore.load();
	const save = () => settingsStore.save();
	const reset = () => settingsStore.reset();
	const updateSettings = (updates: Partial<TSettings>) => settingsStore.updateSettings(updates);
	const updateSection = <T extends keyof TSettings>(section: T, updates: Partial<TSettings[T]>) => {
		return settingsStore.updateSection(section, updates);
	};

	return {
		settings,
		loaded,
		load,
		save,
		reset,
		updateSettings,
		updateSection
	};
};

