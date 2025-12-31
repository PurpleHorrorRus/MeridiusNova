import type { I18nVariables, I18nFunction } from "~/plugins/i18n.client";

export const useStrings = () => {
	const nuxtApp = useNuxtApp();
	
	// Получаем значения из provide плагина i18n
	const i18nPlugin = nuxtApp.$i18n as {
		strings?: Record<string, any>;
		i18n?: I18nFunction;
		getString?: (path: string) => string;
		loadLanguage?: (locale: string) => Promise<void>;
	} | undefined;

	// Fallback на globalProperties
	const $getString = nuxtApp.vueApp?.config?.globalProperties?.$getString as ((path: string) => string) | undefined;
	const $i18n = nuxtApp.vueApp?.config?.globalProperties?.$i18n as I18nFunction | undefined;
	const $strings = nuxtApp.vueApp?.config?.globalProperties?.$strings as Record<string, any> | undefined;

	const getString = (path: string): string => {
		if (i18nPlugin?.getString) {
			return i18nPlugin.getString(path);
		}
		
		if ($getString) {
			return $getString(path);
		}
		
		return path;
	};

	const translate = (path: string, findOrVariables?: string | string[] | I18nVariables, replace?: string | string[]): string => {
		const string = getString(path);
		const translateFn = i18nPlugin?.i18n || $i18n;
		if (translateFn) {
			return translateFn(string, findOrVariables as any, replace);
		}
		return string;
	};

	const loadLanguage = async (locale: string): Promise<void> => {
		if (i18nPlugin?.loadLanguage) {
			await i18nPlugin.loadLanguage(locale);
		}
	};

	return {
		strings: i18nPlugin?.strings || $strings || {},
		getString,
		translate,
		i18n: translate,
		loadLanguage
	};
};
