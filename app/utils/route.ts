export const isUserLibraryPage = (path: string): boolean => {
	return /\/playlist\/\d+\/-1$/.test(path);
};

export const isSearchPage = (path: string): boolean => {
	return path.startsWith("/search");
};