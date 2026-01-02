export const getUserFullName = (user: { first_name?: string; last_name?: string } | null, fallback = "Пользователь"): string => {
	if (!user) {
		return fallback;
	}
	return `${user.first_name || ""} ${user.last_name || ""}`.trim() || fallback;
};

