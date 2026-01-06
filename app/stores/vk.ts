export const useVkStore = defineStore("vk", {
	state: () => ({
		user_id: 0 as number,
		user: null as {
			id: number;
			first_name: string;
			last_name: string;
			avatar: string;
			photo_200?: string;
			photo_max?: string;
			screen_name?: string;
		} | null,
		authenticated: false
	}),

	actions: {
		setUser(user: { id: number; first_name: string; last_name: string; avatar: string; photo_200?: string; photo_max?: string; screen_name?: string }) {
			this.user = {
				...user,
				photo_200: user.photo_200 || user.photo_max || user.avatar,
				photo_max: user.photo_max || user.photo_200 || user.avatar
			};

			this.user_id = user.id;
			this.authenticated = true;
		},

		async fetchUserInfo(): Promise<void> {
			const userInfo = await $fetch<{
				id: number;
				first_name: string;
				last_name: string;
				photo_200: string;
				photo_max?: string;
				screen_name?: string;
			} | null>("/api/vk/user").catch((error: Error) => {
				console.error("Failed to fetch user info:", error);
				return null;
			});

			if (userInfo) {
				this.setUser({
					id: userInfo.id,
					first_name: userInfo.first_name,
					last_name: userInfo.last_name,
					avatar: userInfo.photo_max || userInfo.photo_200,
					photo_200: userInfo.photo_200,
					photo_max: userInfo.photo_max,
					screen_name: userInfo.screen_name
				});
			}
		},

		logout() {
			this.user = null;
			this.user_id = 0;
			this.authenticated = false;
		},

		async refreshPlaylists() {
			// Метод для обновления списка плейлистов после создания/редактирования
			// В будущем можно добавить кеширование плейлистов в store
			return Promise.resolve();
		},

		async loadUserAccounts(accountIds: number[]): Promise<any[]> {
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
		}
	}
});

