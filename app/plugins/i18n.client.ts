type StringsPack = Record<string, any>;

export type I18nVariables = Record<string, string | number>;

export type I18nFunction = {
	(string: string, variables?: I18nVariables): string;
	(string: string, find?: string | string[], replace?: string | string[]): string;
};

const i18n: I18nFunction = (string: string, findOrVariables?: string | string[] | I18nVariables, replace?: string | string[]): string => {
	if (!findOrVariables) {
		return string;
	}

	// Новый способ: объект с переменными
	if (typeof findOrVariables === "object" && !Array.isArray(findOrVariables) && replace === undefined) {
		const variables = findOrVariables as I18nVariables;
		Object.keys(variables).forEach((key) => {
			const value = variables[key];
			string = string.replaceAll(`{{ ${key} }}`, String(value));
		});
		return string;
	}

	// Старый способ: find и replace (для обратной совместимости)
	if (findOrVariables && String(replace)) {
		if (Array.isArray(findOrVariables)) {
			findOrVariables.forEach((part, index) => {
				const toReplace = Array.isArray(replace) ? replace[index] : replace;
				string = string.replaceAll(`{{ ${part} }}`, String(toReplace));
			});
		} else {
			const toReplace = Array.isArray(replace) ? replace[0] : replace;
			string = string.replaceAll(`{{ ${findOrVariables} }}`, String(toReplace));
		}
	}

	return string;
};

const loadLocale = async (locale: string): Promise<StringsPack> => {
	const validLocale = locale === "ru" || locale === "en" ? locale : "ru";
	
	const response = await $fetch<StringsPack>(`/api/i18n/${validLocale}`);
	return response;
};

const getNestedValue = (obj: Record<string, any>, path: string): string => {
	const keys = path.split(".");
	let value = obj;

	for (const key of keys) {
		if (value && typeof value === "object" && key in value) {
			value = value[key];
		} else {
			return path;
		}
	}

	return typeof value === "string" ? value : path;
};

export default defineNuxtPlugin({
	name: "i18n",
	enforce: "post",
	async setup() {
		const { settings, load, loaded } = useSettings();

		if (!loaded.value) {
			await load();
		}

		const currentLocale = settings.value.general.lang || "ru";
		const pack = reactive<StringsPack>(await loadLocale(currentLocale));

		const strings = reactive({
			pack
		});

		const getString = (path: string): string => {
			return getNestedValue(strings.pack, path);
		};

		const loadLanguage = async (locale: string): Promise<void> => {
			const newPack = await loadLocale(locale);
			Object.keys(strings.pack).forEach(key => delete strings.pack[key]);
			Object.assign(strings.pack, newPack);
		};

		watch(() => settings.value.general.lang, async (newLang) => {
			if (newLang) {
				await loadLanguage(newLang);
			}
		});

		const nuxtApp = useNuxtApp();

		nuxtApp.vueApp.config.globalProperties.$strings = strings.pack;
		nuxtApp.vueApp.config.globalProperties.$getString = getString;
		nuxtApp.vueApp.config.globalProperties.$i18n = i18n;

		return {
			provide: {
				strings: strings.pack,
				i18n,
				getString,
				loadLanguage
			}
		};
	}
});
