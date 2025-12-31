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
			statusCode: 400,
			statusMessage: "Invalid locale. Supported locales: ru, en"
		});
	}

	const localeData = locales[locale];

	if (!localeData) {
		throw createError({
			statusCode: 404,
			statusMessage: `Locale file not found: ${locale}`
		});
	}

	return localeData;
});