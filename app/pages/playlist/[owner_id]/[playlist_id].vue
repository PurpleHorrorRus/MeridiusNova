<template>
	<div class="playlist-page">
		<div v-if="pending && !playlistData" class="loading">
			<SkeletonPlaylist :show-header="true" />
		</div>

		<div v-else-if="error && !playlistData" class="error">
			{{ error }}
		</div>

		<div v-else class="playlist-page-content">
			<ClientOnly>
				<CollectionHeader
					v-if="playlistData && isCollection && collectionUser"
					:playlist="playlistData"
					:user="collectionUser"
					@play="handlePlay"
				/>
			</ClientOnly>

			<PlaylistHeader
				v-if="playlistData && !isCollection"
				:playlist="playlistData"
				@play="handlePlay"
				@follow="handleFollow"
			/>

			<!-- Навигация по вкладкам (только для коллекций) -->
			<Navigation v-if="isCollection" />

			<!-- Содержимое вкладки -->
			<div class="playlist-content">
				<NuxtPage />
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { useVkStore } from "~/stores/vk";
import type { TPlaylist } from "~~/server/utils/types";
import { authenticatedFetch } from "~/utils/api";

const route = useRoute();
const vkStore = useVkStore();
const ownerId = computed(() => Number(route.params.owner_id));
const playlistId = computed(() => Number(route.params.playlist_id));
const accessHash = computed(() => route.query.access_hash as string | undefined);

const { playPlaylist, setCurrent } = usePlaylist();

// Загружаем данные плейлиста/коллекции
const playlistData = ref<TPlaylist | null>(null);

const isCollection = computed(() => playlistId.value === -1);

// Для коллекций не загружаем плейлист через API, только для обычных плейлистов
const playlistUrl = computed(() => {
	if (isCollection.value) {
		return "";
	}
	return `/api/vk/playlists/${ownerId.value}/${playlistId.value}`;
});

const { data, pending, error, refresh } = useFetch<TPlaylist | null>(
	playlistUrl,
	{
		query: {
			list: "true",
			access_hash: accessHash.value
		},
		immediate: false,
		lazy: true,
		$fetch: authenticatedFetch as typeof globalThis.$fetch
	}
);

// Запускаем загрузку только для обычных плейлистов
watch([playlistUrl, isCollection], ([url, isCollectionValue]) => {
	if (url && !isCollectionValue) {
		refresh();
	}
}, { immediate: true });

// Для коллекций загружаем информацию о пользователе
const userInfo = ref<{
	id: number;
	first_name: string;
	last_name: string;
	photo_200?: string;
	photo_max?: string;
} | null>(null);

if (isCollection.value && ownerId.value !== vkStore.user_id) {
	const { data: userData } = useFetch<Array<{
		id: number;
		first_name: string;
		last_name: string;
		photo_200?: string;
		photo_max?: string;
	}>>(`/api/vk/users`, {
		query: {
			user_ids: ownerId.value.toString(),
			fields: "photo_200,photo_max"
		}
	});

	watch(userData, (users) => {
		if (users && Array.isArray(users) && users.length > 0 && users[0]) {
			userInfo.value = users[0];
		} else {
			userInfo.value = null;
		}
	}, { immediate: true });
}

// Подготавливаем данные пользователя для CollectionHeader
const collectionUser = computed(() => {
	if (!isCollection.value) {
		return null;
	}

	const user = ownerId.value === vkStore.user_id ? vkStore.user : userInfo.value;
	
	if (!user) {
		return null;
	}

	return {
		id: user.id,
		first_name: user.first_name,
		last_name: user.last_name,
		photo_200: user.photo_200 || (user as any)?.photo_max,
		photo_max: (user as any)?.photo_max || user.photo_200,
		avatar: (user as any)?.avatar || user.photo_200 || (user as any)?.photo_max
	};
});

// Для коллекций создаем плейлист на основе информации о пользователе
// Для обычных плейлистов используем данные из API
watch([data, isCollection, userInfo], ([newPlaylistData, isCollectionValue, userInfoValue]) => {
	if (isCollectionValue) {
		// Для коллекций всегда создаем плейлист на основе информации о пользователе
		const user = ownerId.value === vkStore.user_id ? vkStore.user : userInfo.value;
		const userName = user 
			? `${user.first_name} ${user.last_name}`.trim() 
			: `Пользователь ${ownerId.value}`;
		
		// Для коллекций restricted будет определяться на основе ответа от /api/vk/audio
		// Пока устанавливаем false, дочерний компонент обновит это значение
		playlistData.value = {
			owner_id: ownerId.value,
			playlist_id: -1,
			raw_id: `${ownerId.value}_-1`,
			title: userName,
			cover_url: user?.photo_200 || (user as any)?.photo_max || (user as any)?.avatar || "",
			description: "",
			raw_description: "",
			size: 0,
			listens: 0,
			last_updated: 0,
			explicit: false,
			followed: false,
			official: false,
			restricted: false,
			access_hash: "",
			follow_hash: "",
			edit_hash: "",
			context: "",
			covers: [],
			author: user ? {
				id: user.id,
				name: userName
			} : undefined,
			list: []
		};
	} else {
		// Для обычных плейлистов используем данные из API
		playlistData.value = newPlaylistData || null;
	}
	
	if (playlistData.value) {
		setCurrent(playlistData.value).catch(() => {
			// Игнорируем ошибки при установке плейлиста
		});
	}
}, { immediate: true });

// Предоставляем playlistData для дочерних компонентов
provide("playlistInfo", playlistData);

// Предоставляем информацию о том, что библиотека скрыта
const isCollectionRestricted = computed(() => {
	return isCollection.value && Boolean(playlistData.value?.restricted);
});
provide("isCollectionRestricted", isCollectionRestricted);

const handlePlay = async (playlist: TPlaylist) => {
	await playPlaylist(playlist);
};

const handleFollow = async (playlist: TPlaylist) => {
	// TODO: Implement follow/unfollow API
};
</script>

<style scoped lang="scss">
.playlist-page {
	display: flex;
	flex-direction: column;
	min-height: 100%;
}

.playlist-page-content {
	display: flex;
	flex-direction: column;
	flex: 1;
}

.playlist-content {
	flex: 1;
	display: flex;
	flex-direction: column;
}

.loading {
	padding: 32px;

	@media (max-width: 768px) {
		padding: 16px;
	}

	@media (max-width: 480px) {
		padding: 12px;
	}
}

.error {
	text-align: center;
	padding: 40px;

	@media (max-width: 768px) {
		padding: 20px;
	}

	@media (max-width: 480px) {
		padding: 16px;
	}
}
</style>
