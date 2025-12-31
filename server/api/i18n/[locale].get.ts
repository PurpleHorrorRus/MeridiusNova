import path from "node:path";
import fs from "fs-extra";

export default defineEventHandler(async (event) => {
	const locale = getRouterParam(event, "locale");

	if (!locale || !["ru", "en"].includes(locale)) {
		throw createError({
			statusCode: 400,
			statusMessage: "Invalid locale. Supported locales: ru, en"
		});
	}

	const localePath = path.resolve(process.cwd(), "i18n", "locales", `${locale}.json`);

	if (!fs.pathExistsSync(localePath)) {
		throw createError({
			statusCode: 404,
			statusMessage: `Locale file not found: ${locale}`
		});
	}

	const localeData = await fs.readJson(localePath);
	return localeData;
});

