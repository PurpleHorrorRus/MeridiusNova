import themesData from "~/static/themes.json";

type Theme = {
	id: string;
	name: string;
	description: string;
	satisfies: boolean;
	accent: {
		primary: string;
		secondary: string;
	};
	colors: {
		"bg-primary": string;
		"bg-secondary": string;
		"bg-sidebar": string;
		"bg-player": string;
		"bg-tertiary": string;
		"bg-hover": string;
		"bg-active": string;
		"text": string;
		"text-secondary": string;
		"text-tertiary": string;
		"primary": string;
		"primary-hover": string;
		"border": string;
		"border-secondary": string;
		"scroll": string;
		"scroll-hover": string;
		"hover": string;
		"active": string;
	};
	author: {
		name: string;
		contact: string;
	};
};

const themes = themesData as Theme[];

const getThemeById = (themeId: string): Theme | undefined => {
	return themes.find(theme => theme.id === themeId);
};

const applyTheme = (themeId: string): void => {
	if (!import.meta.client) {
		return;
	}

	const theme = getThemeById(themeId);

	if (!theme || !theme.colors) {
		return;
	}

	const root = document.documentElement;

	Object.entries(theme.colors).forEach(([key, value]) => {
		root.style.setProperty(`--${key}`, value);
	});
};

export const useTheme = () => {
	return {
		applyTheme,
		getThemeById,
		themes
	};
};
