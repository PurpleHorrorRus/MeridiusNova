import { storeToRefs } from "pinia";
import { isTauri } from "~/utils/tauri";
import { useSettingsStore } from "~/stores/settings";

export const useUpdater = () => {
	const settingsStore = useSettingsStore();
	const { settings } = storeToRefs(settingsStore);
	const checking = ref(false);
	const updateAvailable = ref(false);
	const updateError = ref<string | null>(null);
	const currentVersion = ref<string | null>(null);
	const updateInfo = ref<any>(null);

	const getCurrentVersion = async (): Promise<string | null> => {
		if (!isTauri() || !import.meta.client) {
			return null;
		}

		const versionModule = await import("@tauri-apps/api/app").catch((error) => {
			console.error("Failed to import app module:", error);
			return null;
		});

		if (!versionModule) {
			return null;
		}

		const version = await versionModule.getVersion().catch((error) => {
			console.error("Failed to get current version:", error);
			return null;
		});

		if (version) {
			currentVersion.value = version;
		}

		return version;
	};

	const getUpdateChannel = (): "production" | "beta" | "development" => {
		return settings.value.general.updateChannel || "production";
	};

	const setUpdateChannel = async (channel: "production" | "beta" | "development") => {
		await settingsStore.updateSection("general", { updateChannel: channel });
	};

	const checkForUpdates = async (): Promise<boolean> => {
		if (!isTauri() || !import.meta.client) {
			updateError.value = "Not running in Tauri";
			return false;
		}

		checking.value = true;
		updateError.value = null;
		updateAvailable.value = false;

		const appModule = await import("@tauri-apps/api/app").catch((error) => {
			checking.value = false;
			updateError.value = "Failed to load app module";
			console.error("Failed to import app module:", error);
			return null;
		});

		if (!appModule) {
			return false;
		}

		const currentVer = await appModule.getVersion().catch((error) => {
			checking.value = false;
			updateError.value = "Failed to get current version";
			console.error("Failed to get version:", error);
			return null;
		});

		if (!currentVer) {
			return false;
		}

		const channel = getUpdateChannel();

		const updateResponse = await $fetch<{
			available: boolean;
			version?: string;
			url?: string;
			body?: string;
			date?: string;
			size?: number;
			error?: string;
		}>("/api/updates/check", {
			params: {
				channel,
				currentVersion: currentVer
			}
		}).catch((error) => {
			checking.value = false;
			updateError.value = error?.message || "Failed to check for updates";
			console.error("Failed to check for updates:", error);
			return null;
		});

		if (!updateResponse) {
			return false;
		}

		if (updateResponse.error) {
			checking.value = false;
			updateError.value = updateResponse.error;
			return false;
		}

		if (updateResponse.available && updateResponse.version) {
			updateInfo.value = {
				version: updateResponse.version,
				body: updateResponse.body || "",
				date: updateResponse.date,
				url: updateResponse.url,
				size: updateResponse.size
			};
			updateAvailable.value = true;
			checking.value = false;
			return true;
		}

		checking.value = false;
		return false;
	};

	const installUpdate = async (): Promise<boolean> => {
		if (!isTauri() || !import.meta.client) {
			updateError.value = "Not running in Tauri";
			return false;
		}

		if (!updateAvailable.value || !updateInfo.value?.url) {
			updateError.value = "No update available";
			return false;
		}

		const updaterModule = await import("@tauri-apps/plugin-updater").catch((error) => {
			updateError.value = "Failed to load updater module";
			console.error("Failed to import updater module:", error);
			return null;
		});

		if (!updaterModule) {
			return false;
		}

		const check = updaterModule.check || (updaterModule as any).default?.check;

		if (!check) {
			updateError.value = "Updater check function not available";
			return false;
		}

		const updater = await check().catch((error) => {
			updateError.value = error?.message || "Failed to check for updates";
			console.error("Failed to check for updates:", error);
			return null;
		});

		if (!updater?.available) {
			updateError.value = "No update available";
			return false;
		}

		await updater.downloadAndInstall().catch((error) => {
			updateError.value = error?.message || "Failed to install update";
			console.error("Failed to install update:", error);
			return false;
		});

		return true;
	};

	if (import.meta.client) {
		getCurrentVersion();
	}

	return {
		checking: readonly(checking),
		updateAvailable: readonly(updateAvailable),
		updateError: readonly(updateError),
		currentVersion: readonly(currentVersion),
		updateInfo: readonly(updateInfo),
		getCurrentVersion,
		getUpdateChannel,
		setUpdateChannel,
		checkForUpdates,
		installUpdate
	};
};

