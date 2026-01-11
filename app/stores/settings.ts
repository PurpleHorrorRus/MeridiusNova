import type { TSettings } from "~~/server/utils/types";
import { isTauri } from "~/utils/tauri";

type TTauriLocalSettings = {
	general: {
		server: {
			enable: boolean;
			type: "local" | "remote";
			url: string;
			port: number;
		};
	};
	window: {
		hardwareAcceleration: boolean;
	};
};

const loadTauriLocalSettings = async (): Promise<Partial<TTauriLocalSettings> | null> => {
	if (!isTauri() || !import.meta.client) {
		return null;
	}

	const { Store } = await import("@tauri-apps/plugin-store");
	const store = await Store.load(".tauri-local.dat");
	const saved = await store.get<Partial<TTauriLocalSettings>>("tauriLocal");

	await store.close().catch(() => {});

	return saved || null;
};

const saveTauriLocalSettings = async (localSettings: Partial<TTauriLocalSettings>): Promise<void> => {
	if (!isTauri() || !import.meta.client) {
		return;
	}

	const { Store } = await import("@tauri-apps/plugin-store");
	const store = await Store.load(".tauri-local.dat");
	await store.set("tauriLocal", localSettings);
	await store.save();

	await store.close().catch(() => {});
};

const defaultSettings: TSettings = {
	window: {
		display: 0,
		width: 960,
		height: 600,
		x: 0,
		y: 0,
		fullscreen: false,
		multithreading: false,
		hardwareAcceleration: false,
		startup: false,
		hideOnClose: true,
		devtools: false
	},

	general: {
		lang: "ru",
		logging: true,
		beta: false,
		updateChannel: "production",
		discord: {
			enable: false,
			timeline: false,
			reverse: false
		},
		streamer: {
			enable: false,
			path: ""
		},
		proxy: {
			enable: false,
			url: ""
		},
		server: {
			enable: false,
			type: "local" as "local" | "remote",
			url: "",
			port: 31415
		}
	},

	player: {
		output: "default",
		volume: 0.5,
		random: false,
		repeat: false,
		playbackRate: 1,
		mute: false,
		broadcast: false,
		volumeDivider: 1,
		rewind: false,
		timeMode: 0,
		latest: {
			save: true,
			exit: true,
			play: false
		},
		miniwindow: {
			enable: false,
			minimode: false,
			x: 0,
			y: 0
		},
		normalizer: {
			enable: false,
			max: 5
		},
		crossfade: {
			enable: false,
			duration: 6,
			fade: false
		},
		step: {
			wheel: 1,
			hotkey: 5
		},
		playbackRateStep: {
			click: 0.25,
			wheel: 0.25,
			hotkey: 0.25
		}
	},

	download: {
		enable: false,
		path: "",
		template: "{{ performer }} - {{ title }}"
	},

	appearance: {
		layout: 1,
		expand: true,
		leftMenuWidth: 210,
		rightMenuWidth: 210,
		queueHeight: 150,
		roundedTop: false,
		roundedBottom: false,
		hideTitlebarButtons: false,
		fullFrame: true,
		customTheme: false,
		theme: "classic",
		acryl: {
			enable: false,
			material: "none",
			opacity: 0.5
		},
		sidebarPlaylistsExpanded: false,
		sidebarLibraryExpanded: true
	},

	optimization: {
		fetchRestriction: 1000,
		stashSize: 20,
		download: {
			auto: true,
			fixed: 2
		}
	},

	equalizer: {
		enable: false,
		levels: new Array(18).fill(0),
		spectrumVisualization: false
	},

	cache: {
		enable: false,
		path: "",
		maxSize: 1024
	},

	vk: {
		active: -1,
		accounts: []
	},

	hotkeys: {}
};

const loadSettingsFromServer = async (): Promise<Partial<TSettings> | null> => {
	if (!import.meta.client) {
		return null;
	}

	return await $fetch<Partial<TSettings> | null>("/api/settings");
};

const saveSettingsToServer = async (settings: TSettings): Promise<void> => {
	if (!import.meta.client) {
		return;
	}

	const { general, ...settingsWithoutGeneral } = settings;
	const { server, ...generalWithoutServer } = general;
	const settingsWithoutServer = {
		...settingsWithoutGeneral,
		general: generalWithoutServer
	};

	await $fetch("/api/settings", {
		method: "POST",
		body: settingsWithoutServer
	});
};

const mergeSettings = (settings: Partial<TSettings>, defaults: TSettings): TSettings => {
	const merged = { ...defaults };

	for (const key in settings) {
		if (Object.prototype.hasOwnProperty.call(settings, key)) {
			const settingsKey = key as keyof TSettings;
			const settingsValue = settings[settingsKey];
			const defaultValue = defaults[settingsKey];

			if (settingsValue !== undefined) {
				if (typeof settingsValue === "object" && !Array.isArray(settingsValue) && settingsValue !== null && typeof defaultValue === "object" && !Array.isArray(defaultValue) && defaultValue !== null) {
					(merged as any)[settingsKey] = { ...defaultValue, ...settingsValue };
				} else {
					(merged as any)[settingsKey] = settingsValue;
				}
			}
		}
	}

	return merged;
};

export const useSettingsStore = defineStore("settings", {
	state: (): { settings: TSettings; loaded: boolean } => ({
		settings: { ...defaultSettings },
		loaded: false
	}),

	actions: {
		async load() {
			if (this.loaded) {
				return;
			}

			if (import.meta.client) {
				let localSettings: Partial<TTauriLocalSettings> | null = null;

				if (isTauri()) {
					localSettings = await loadTauriLocalSettings();
				}

				const saved = await loadSettingsFromServer();

				if (saved) {
					const savedWithoutServer: Partial<TSettings> = { ...saved };
					if (savedWithoutServer.general && saved.general) {
						const { server, ...generalWithoutServer } = saved.general;
						savedWithoutServer.general = generalWithoutServer as any;
					}
					this.settings = mergeSettings(savedWithoutServer, defaultSettings);
				}

				if (isTauri()) {
					if (localSettings?.general?.server) {
						this.settings.general.server = {
							enable: localSettings.general.server.enable ?? defaultSettings.general.server.enable,
							type: localSettings.general.server.type ?? defaultSettings.general.server.type,
							url: localSettings.general.server.url ?? defaultSettings.general.server.url,
							port: localSettings.general.server.port ?? defaultSettings.general.server.port
						};
					} else {
						this.settings.general.server = { ...defaultSettings.general.server };
					}
					if (localSettings?.window?.hardwareAcceleration !== undefined) {
						this.settings.window.hardwareAcceleration = localSettings.window.hardwareAcceleration;
					}
				}
			}

			this.loaded = true;
		},

		async save() {
			if (!import.meta.client) {
				return;
			}

			await saveSettingsToServer(this.settings);

			if (isTauri()) {
				await saveTauriLocalSettings({
					general: {
						server: this.settings.general.server
					},
					window: {
						hardwareAcceleration: this.settings.window.hardwareAcceleration
					}
				});
			}
		},

		async updateSettings(updates: Partial<TSettings>) {
			this.settings = mergeSettings(updates, this.settings);
			await this.save();
		},

		async updateSection<T extends keyof TSettings>(section: T, updates: Partial<TSettings[T]>) {
			const currentValue = this.settings[section];
			if (typeof currentValue === "object" && currentValue !== null && !Array.isArray(currentValue)) {
				this.settings[section] = { ...currentValue, ...updates } as TSettings[T];
			} else {
				this.settings[section] = updates as TSettings[T];
			}
			await this.save();
		},

		reset() {
			this.settings = { ...defaultSettings };
			this.save();
		}
	}
});

