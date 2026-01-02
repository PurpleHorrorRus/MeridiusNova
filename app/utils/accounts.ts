export const loadUserAccounts = async (accountIds: number[]): Promise<any[]> => {
	if (accountIds.length === 0) {
		return [];
	}

	const chunks = [];
	for (let i = 0; i < accountIds.length; i += 100) {
		chunks.push(accountIds.slice(i, i + 100));
	}

	const accounts: any[] = [];

	for (const chunk of chunks) {
		const response = await $fetch("/api/vk/users", {
			params: {
				user_ids: chunk.join(","),
				fields: "photo_100"
			}
		}).catch(() => null);

		if (response && Array.isArray(response)) {
			accounts.push(...response);
		}
	}

	return accounts;
};

