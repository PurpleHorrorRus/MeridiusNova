import type { TPlaylist } from "~~/server/utils/types";
import { useVkStore } from "~/stores/vk";
import { getUserFullName } from "./user";

const getString = (path: string): string => {
	if (typeof window === "undefined" || typeof useNuxtApp === "undefined") {
		return path;
	}

	try {
		const nuxtApp = useNuxtApp();
		const $getString = nuxtApp.vueApp?.config?.globalProperties?.$getString as ((path: string) => string) | undefined;
		
		if ($getString) {
			return $getString(path);
		}

		const i18nPlugin = nuxtApp.$i18n as { getString?: (path: string) => string } | undefined;
		if (i18nPlugin?.getString) {
			return i18nPlugin.getString(path);
		}
	} catch {
		// Если не удалось получить getString, возвращаем путь
	}

	return path;
};

export const normalizePlaylist = async (playlist: TPlaylist): Promise<TPlaylist> => {
	const vkStore = useVkStore();
	const normalized = { ...playlist };

	// Определяем title
	if (playlist.raw_id.startsWith("search_")) {
		normalized.title = getString("queue.source.search");
	} else if (playlist.playlist_id === -9 || String(playlist.owner_id) === "vkmix") {
		normalized.title = getString("queue.source.vkMix");
	} else if (playlist.playlist_id === -1) {
		// Плейлист пользователя - показываем имя пользователя
		if (playlist.author?.name) {
			normalized.title = playlist.author.name;
		} else if (playlist.owner_id === vkStore.user_id && vkStore.user) {
			normalized.title = getUserFullName(vkStore.user);
		} else {
			normalized.title = playlist.title || getString("queue.source.myMusic");
		}
	} else if (playlist.context) {
		const contextMap: Record<string, string> = {
			"wall": getString("queue.source.wall"),
			"feed": getString("queue.source.feed"),
			"updates": getString("queue.source.updates"),
			"general": getString("queue.source.general"),
			"artist": getString("queue.source.artist"),
			"popular": getString("queue.source.popular")
		};
		normalized.title = contextMap[playlist.context] || playlist.title;
	}

	// Определяем description
	if (playlist.raw_id.startsWith("search_")) {
		normalized.description = playlist.raw_id.replace("search_", "");
	} else if (playlist.playlist_id === -1) {
		normalized.description = getString("queue.source.userPlaylist");
	}

	// Определяем cover_url для плейлиста пользователя
	// Если cover_url не установлен или пустой, устанавливаем его из фото пользователя
	if (playlist.playlist_id === -1 && (!normalized.cover_url || normalized.cover_url.trim() === "")) {
		// Для текущего пользователя используем данные из vkStore
		if (playlist.owner_id === vkStore.user_id && vkStore.user) {
			normalized.cover_url = vkStore.user.photo_200 || vkStore.user.photo_max || vkStore.user.avatar || "";
		} else if (playlist.owner_id > 0) {
			// Для других пользователей получаем информацию через API
			try {
				const users = await $fetch<Array<{
					id: number;
					first_name: string;
					last_name: string;
					photo_200?: string;
					photo_max?: string;
				}>>("/api/vk/users", {
					query: {
						user_ids: playlist.owner_id.toString(),
						fields: "photo_200,photo_max"
					}
				});

				if (users && Array.isArray(users) && users.length > 0 && users[0]) {
					const user = users[0];
					normalized.cover_url = user.photo_200 || user.photo_max || "";
				}
			} catch {
				// Если не удалось получить информацию о пользователе, оставляем cover_url пустым
			}
		}
	}

	return normalized;
};

