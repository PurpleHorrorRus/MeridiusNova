import type { TSettings } from "~~/server/utils/types";

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
		tabs: false,
		customTheme: false,
		theme: "classic",
		acryl: {
			enable: false,
			material: "none",
			opacity: 0.5
		}
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
		levels: new Array(18).fill(0)
	},


	vk: {
		active: -1,
		accounts: []
	},

	favs: {
		users: [],
		groups: [],
		artists: []
	},

	hotkeys: {},

	latest: {
		song: null,
		playlist: null
	},

	tabs: {
		active: 0,
		list: [{
			page: 0,
			title: "",
			icon: "",
			history: []
		}]
	},
	settingHints: {
		ru: {
			general: {
				hardwareAcceleration: "Требуется перезапуск приложения",
				beta: "Тестовые сборки могут работать нестабильно, однако вы получаете возможность тестировать новые функции раньше остальных. Требуется перезапуск приложения",
				streamer: "Записывает в файлы, находящихся в указанной папке информацию о текущем треке для отображения через OBS и другие приложения для прямых трансляций",
				proxy: {
					url: "Требуется перезапуск приложения"
				}
			},
			appearance: {
				windowControlButtons: "Будет полезно, если вы используете тайлинговый оконный менеджер",
				fullFrame: "Использование всего пространства отключает прозрачное окно, из-за чего будут недоступны внешние тени у границ окна и скругления по краям, но гарантирует полную работу функционала нативного окна. Требуется перезапуск приложения",
				acrylic: "Не рекомендуется включать. Необходимо включить эффекты прозрачности в настройках Windows. После применения требуется перезапуск приложения",
				zoom: [
					"Используйте горячие клавиши для изменения масштаба интерфейса:",
					"Ctrl + для увеличения",
					"Ctrl - для уменьшения",
					"Ctrl 0 для сброса"
				],
				themes: {
					download: "Заполните все поля. Принимаются только данные с GitHub"
				}
			},
			player: {
				volumeDivider: "Если вам кажется, что громкость треков не соответствует заданному проценту громкости в плеере, то измените делитель уровня громкости",
				miniwindow: {
					minimode: "Отключает управление миниокном, а так же все стили, оставляя только информацию о текущем треке"
				},
				rewind: "Включив эту опцию, при нажатии на кнопку \"предыдущий трек\", плеер начнёт проигрывать трек заново вместо проигрывания предыдущего, если прогресс прослушивания достиг {{ rewind }} секунд и более",
				normalizer: {
					tip: "Усредняет уровень громкости трека. Не включайте данную опцию, если слушаете музыку на средне-высоком уровне громкости (от 20% и выше)",
					max: "Громкость музыки - субъективное понятие. Выберите сами для себя максимальный процент увеличения громкости музыки"
				}
			},
			optimization: {
				multithreading: "Требуется перезапуск приложения",
				hardwareAcceleration: "Требуется перезапуск приложения",
				stashSize: "Для оптимизации работы с системными ресурсами Meridius использует собственную систему хранилища музыки при загрузке. Данная настройка определяет, сколько аудиозаписей будет отображено при переходе в плейлист. Вы можете задать количество в диапазоне от 20 до 100",
				loadingRestriction: "Здесь вы можете выставить желаемое максимальное количество треков, которое будет загружено при проигрывании плейлистов. По умолчанию, количество загружаемых треков равно 1000, минимальное равно 100, максимальное равно 10000. Не рекомендуется выставлять значение выше 2000, так как это может привести к долгим загрузкам, зависаниям, вылетам и чрезмерному потреблению системных ресурсов при большом количестве аудио",
				download: {
					auto: "Рекомендуется к использованию. Количество загрузок определяется в зависимости от производительности вашего процессора во избежание зависания приложения или системы",
					fixed: "Вы можете задать фиксированное значение для одновременных загрузок. Значение не может быть больше 10. Повышайте значение на свой страх и риск, если у вас слабый процессор"
				}
			},
			downloads: {
				ffmpeg: "FFmpeg - бесплатная утилита с открытым исходным кодом, позволяющая обрабатывать медиафайлы. Необходима для объединения стриминговых файлов в один",
				template: "Задайте шаблон для названия файла при скачивании, используя заголовки"
			},
			server: {
				password: "Ваш пароль шифруется единожды и нигде не хранится, поэтому его следует записать. Сервер сверяет подлинность пароля при запросе. Откройте руководство для более подробной информации о работе сервера и подключении"
			}
		},
		en: {
			general: {
				hardwareAcceleration: "Requires application restart",
				beta: "Test builds may be unstable, but you get the opportunity to test new features before others. Requires application restart",
				streamer: "Writes information about the current track to files located in the specified folder for display via OBS and other applications for live broadcasts",
				proxy: {
					url: "Requires application restart"
				}
			},
			appearance: {
				windowControlButtons: "It will be useful if you use a tiling window manager",
				fullFrame: "Using the entire space disables the transparent window, which will make outer shadows at the window borders and rounding at the edges inaccessible, but guarantees full functionality of the native window. Requires application restart",
				acrylic: "Not recommended. You need to enable acrylic effects in Windows settings. Requires application restart",
				zoom: [
					"Use keyboard shortcuts to change the scale of the interface:",
					"Ctrl + to zoom in",
					"Ctrl - to zoom out",
					"Ctrl 0 to reset"
				],
				themes: {
					download: "Fill in all the fields. Only data from GitHub is accepted"
				}
			},
			player: {
				volumeDivider: "If it seems to you that the volume of the tracks does not correspond to the specified percentage of the volume in the player, then change the volume divider",
				miniwindow: {
					minimode: "Disables mini window controls and styles keeping only current track information"
				},
				rewind: "By enabling this option, when you press the \"previous track\" button, the player will start playing the track again instead of playing the previous track if the listening progress has reached {{ rewind }} seconds or more ",
				normalizer: {
					tip: "Averages the volume level of the music. Do not enable this option if you are listening to music at a medium or high volume level (from 20% and above)",
					max: "The volume of music is a subjective concept. Choose for yourself the maximum percentage of music volume increase"
				}
			},
			optimization: {
				multithreading: "Requires application restart",
				hardwareAcceleration: "Requires application restart",
				stashSize: "To optimize work with system resources, Meridius uses its own music storage system when downloading. This setting determines how many audios will be displayed when redirecting to the playlist. You can set number in the range from 20 to 100",
				loadingRestriction: "Here you can set the desired maximum number of tracks that will be loaded when playing playlists. By default, the number of downloaded tracks is 1000, the minimum is 100, the maximum is 10000. It is not recommended to set a value higher than 2000, this cause long downloads, freezes, crashes and high consumption of system resources with a large amount of audio",
				download: {
					auto: "Recommended for use. The number of downloads is determined depending on the performance of your processor in order to avoid application or system freezes",
					fixed: "You can set a fixed value for simultaneous downloads. The value cannot be greater than 10. Increase the value at your own risk if you have a low performance CPU"
				}
			},
			downloads: {
				ffmpeg: "FFmpeg - it's free open-source tool to processing media files. Requires for combining streaming files into one",
				template: "Set a template for the file name when downloading using headers"
			},
			server: {
				password: "Your password is encrypted once and is not stored anywhere, so it should be written down. The server verifies the authenticity of the password upon request. Open the manual for more detailed information about server and connection"
			}
		}
	}
};

const isTauri = typeof window !== "undefined" && "__TAURI__" in window;

const loadSettingsFromTauri = async (): Promise<Partial<TSettings> | null> => {
	if (!isTauri || !import.meta.client) {
		return null;
	}

	const { Store } = await import("@tauri-apps/plugin-store");
	const store = await Store.load(".settings.dat");
	const saved = await store.get<Partial<TSettings>>("settings");

	return saved;
};

const loadSettingsFromServer = async (): Promise<Partial<TSettings> | null> => {
	if (!import.meta.client) {
		return null;
	}

	const response = await $fetch<Partial<TSettings> | null>("/api/settings");

	return response;
};

const saveSettingsToTauri = async (settings: TSettings): Promise<void> => {
	if (!isTauri || !import.meta.client) {
		return;
	}

	const { Store } = await import("@tauri-apps/plugin-store");
	const store = await Store.load(".settings.dat");
	await store.set("settings", settings);
	await store.save();
};

const saveSettingsToServer = async (settings: TSettings): Promise<void> => {
	if (!import.meta.client) {
		return;
	}

	await $fetch("/api/settings", {
		method: "POST",
		body: settings
	});
};

const mergeSettings = (settings: Partial<TSettings>, defaults: TSettings): TSettings => {
	const merged = { ...defaults };

	for (const key in settings) {
		if (settings[key] !== undefined) {
			if (typeof settings[key] === "object" && !Array.isArray(settings[key]) && settings[key] !== null) {
				merged[key] = mergeSettings(settings[key] as any, defaults[key] as any);
			} else {
				merged[key] = settings[key] as any;
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
				let saved: Partial<TSettings> | null = null;

				if (isTauri) {
					saved = await loadSettingsFromTauri();
				} else {
					saved = await loadSettingsFromServer();
				}

				if (saved) {
					this.settings = mergeSettings(saved, defaultSettings);
				}
			}

			this.loaded = true;
		},

		async save() {
			if (!import.meta.client) {
				return;
			}

			if (isTauri) {
				await saveSettingsToTauri(this.settings);
			} else {
				await saveSettingsToServer(this.settings);
			}
		},

		async updateSettings(updates: Partial<TSettings>) {
			this.settings = mergeSettings(updates, this.settings);
			await this.save();
		},

		async updateSection<T extends keyof TSettings>(section: T, updates: Partial<TSettings[T]>) {
			this.settings[section] = mergeSettings(updates, this.settings[section]) as TSettings[T];
			await this.save();
		},

		reset() {
			this.settings = { ...defaultSettings };
			this.save();
		}
	}
});

