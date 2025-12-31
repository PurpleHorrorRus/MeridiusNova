import { useVkStore } from "~/stores/vk";

export const useAuthInit = () => {
	const session = useUserSession();
	const vkStore = useVkStore();

	const initialize = async (): Promise<boolean> => {
		// Проверяем токен через check-session
		const sessionData = await $fetch<{ loggedIn: boolean; user: { id: number } | null }>("/api/vk/login");

		if (!sessionData || !sessionData.loggedIn) {
			return false;
		}

		const userInfo = await $fetch<{
			id: number;
			first_name: string;
			last_name: string;
			photo_200: string;
			photo_max?: string;
			screen_name?: string;
		}>("/api/vk/user");

		vkStore.setUser({
			id: userInfo.id,
			first_name: userInfo.first_name,
			last_name: userInfo.last_name,
			avatar: userInfo.photo_max || userInfo.photo_200,
			photo_200: userInfo.photo_200,
			photo_max: userInfo.photo_max,
			screen_name: userInfo.screen_name
		});

		await session.fetch();
		return true;
	};

	return { 
		initialize,
		loggedIn: session.loggedIn
	};
};
