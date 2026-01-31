import ruLocale from "~~/i18n/locales/ru.json";
import enLocale from "~~/i18n/locales/en.json";

const locales: Record<string, any> = {
	ru: ruLocale,
	en: enLocale
};

export default defineEventHandler(async (event) => {
	const locale = getRouterParam(event, "locale");

	if (!locale || !["ru", "en"].includes(locale)) {
		throw createError({
			status: 400,
			statusText: "Invalid locale. Supported locales: ru, en"
		});
	}

	const localeData = locales[locale];

	if (!localeData) {
		throw createError({
			status: 404,
			statusText: `Locale file not found: ${locale}`
		});
	}

	return localeData;
});