<template>
	<div class="sidebar">
		<ClientOnly>
			<MobileBottomNav v-if="showBottomNavigation" />

			<div v-else class="desktop-sidebar">
				<SidebarSearch :show-search-in-titlebar="showSearchInTitlebar" />

				<SidebarNavigation
					:user-playlists="userPlaylists"
					:playlists-expanded="playlistsExpanded"
					:playlist-playing-states="playlistPlayingStates"
					:playlist-loading-states="playlistLoadingStates"
					@update:playlists-expanded="playlistsExpanded = $event"
					@playlist-play="handlePlaylistPlay"
					@playlist-created="loadUserPlaylists"
				/>

				<div class="sidebar-bottom-section">
					<Downloads v-if="!isTauri()" :show-label="true" :icon-size="24" />

					<SidebarSettingsButton />

					<SidebarUser :accounts="accounts" />
				</div>
			</div>

			<template #fallback>
				<div class="desktop-sidebar">
					<SidebarSearch :show-search-in-titlebar="false" />

					<SidebarNavigation
						:user-playlists="userPlaylists"
						:playlists-expanded="playlistsExpanded"
						:playlist-playing-states="playlistPlayingStates"
						:playlist-loading-states="playlistLoadingStates"
						@update:playlists-expanded="playlistsExpanded = $event"
						@playlist-play="handlePlaylistPlay"
						@playlist-created="loadUserPlaylists"
					/>

					<div class="sidebar-bottom-section">
						<Downloads v-if="!isTauri()" :show-label="true" :icon-size="24" />

						<SidebarSettingsButton />

						<SidebarUser :accounts="accounts" />
					</div>
				</div>
			</template>
		</ClientOnly>
	</div>
</template>

<script setup lang="ts">
import MobileBottomNav from "~/components/Navigation/MobileBottomNav.vue";
import SidebarSearch from "~/components/Navigation/SidebarSearch.vue";
import SidebarNavigation from "~/components/Navigation/SidebarNavigation.vue";
import SidebarSettingsButton from "~/components/Navigation/SidebarSettingsButton.vue";
import SidebarUser from "~/components/Navigation/SidebarUser.vue";
import Downloads from "~/components/Downloads/Downloads.vue";

import { useVkStore } from "~/stores/vk";
import { usePlaylistStore } from "~/stores/playlist";
import { usePlayerStore } from "~/stores/player";

import { useEventListener } from "~/composables/useEventListener";

import { isTauri } from "~/utils/tauri";

const playlistStore = usePlaylistStore();

const vkStore = useVkStore();
const settingsStore = useSettingsStore();
const { settings } = storeToRefs(settingsStore);
const playerStore = usePlayerStore();

const userId = computed(() => vkStore.user_id || 0);
const accounts = ref<any[]>([]);
const userPlaylists = ref<any[]>([]);
const playlistsExpanded = ref(false);
const playlistPlayingStates = ref<Record<string, boolean>>({});
const playlistLoadingStates = ref<Record<string, boolean>>({});

const windowWidth = ref(0);

const showSearchInTitlebar = computed(() => {
	return windowWidth.value <= 600;
});

const showBottomNavigation = computed(() => {
	return windowWidth.value <= 600;
});

const updatePlaylistStates = () => {
	userPlaylists.value.forEach(playlist => {
		const currentPlaying = playlistStore.playing;
		const isCurrent = currentPlaying && currentPlaying.raw_id === playlist.raw_id;
		playlistPlayingStates.value[playlist.raw_id] = Boolean(isCurrent && !playerStore.paused);
	});
};

const handlePlaylistPlay = async (playlist: any) => {
	const playlistRawId = playlist.raw_id;
	const currentPlaying = playlistStore.playing;
	const isCurrent = currentPlaying && currentPlaying.raw_id === playlistRawId;

	if (isCurrent && !playerStore.paused) {
		playerStore.pause();
		playlistPlayingStates.value[playlistRawId] = false;
	} else if (isCurrent && playerStore.paused) {
		playerStore.resume();
		playlistPlayingStates.value[playlistRawId] = true;
	} else {
		playlistLoadingStates.value[playlistRawId] = true;
		await playlistStore.playPlaylist(playlist).finally(() => {
			playlistLoadingStates.value[playlistRawId] = false;
		});
	}
};

// Объединяем watchers для оптимизации производительности
watch([() => playlistStore.playing, () => playerStore.paused, () => playerStore.isPlaying], () => {
	updatePlaylistStates();
}, { immediate: true });

const loadUserPlaylists = async () => {
	if (!userId.value) {
		userPlaylists.value = [];
		return;
	}

	const playlistsData = await $fetch<{ count: number; playlists: any[] }>("/api/vk/playlists", {
		params: {
			owner_id: userId.value
		}
	}).catch(() => {
		return { count: 0, playlists: [] };
	});

	userPlaylists.value = playlistsData.playlists || [];
};

const loadAccounts = async () => {
	const vkStore = useVkStore();
	const accountIds = settings.value.vk.accounts.map(account => account.user).filter((id): id is number => typeof id === "number");
	const loadedAccounts = await vkStore.loadUserAccounts(accountIds);
	accounts.value.push(...loadedAccounts);
};

onMounted(async () => {
	if (typeof window !== "undefined") {
		windowWidth.value = window.innerWidth;

		const handleResize = () => {
			windowWidth.value = window.innerWidth;
		};

		useEventListener(window, "resize", handleResize);
	}

	await settingsStore.load();
	await loadAccounts();
	playlistsExpanded.value = Boolean(settings.value.appearance.sidebarPlaylistsExpanded ?? false);
	await loadUserPlaylists();
});

watch(userId, async () => {
	playlistsExpanded.value = Boolean(settings.value.appearance.sidebarPlaylistsExpanded ?? false);
	await loadUserPlaylists();
});

// Обновляем список плейлистов при событии обновления
if (typeof window !== "undefined") {
	window.addEventListener("playlists-updated", async () => {
		await loadUserPlaylists();
	});
}
</script>

<style scoped lang="scss">
.sidebar {
	display: flex;
	flex-direction: column;
	width: 240px;
	height: 100%;
	background: var(--bg-sidebar, #1a1a1a);
	border-right: 1px solid var(--border, #2a2a2a);
	overflow-y: auto;
	overflow-x: hidden;

	@media (max-width: 600px) {
		padding-bottom: 60px;
		width: 100%;
		height: calc(100% - 60px);
		position: fixed;
		top: 0;
		left: 0;
		z-index: 999;
	}

	@media (max-width: 1000px) {
		width: 200px;
	}

	@media (max-width: 800px) {
		width: 180px;
	}

	@media (max-width: 700px) {
		width: 160px;
	}
}

.desktop-sidebar {
	display: flex;
	flex-direction: column;
	height: 100%;

	@media (max-width: 600px) {
		display: none;
	}
}

.sidebar-bottom-section {
	display: flex;
	flex-direction: column;
	margin-top: auto;
	overflow: visible;

	:deep(.downloads-container) {
		width: 100%;
		position: relative;
		overflow: visible;

		.downloads-button {
			width: 100%;
			height: auto;
			padding: 12px 20px;
			justify-content: flex-start;
			gap: 12px;
			border-top: 1px solid var(--border, #2a2a2a);
			border-radius: 0;

			@media (max-width: 1000px) {
				padding: 10px 16px;
				gap: 10px;
			}

			@media (max-width: 800px) {
				padding: 8px 12px;
				gap: 8px;
			}

			@media (max-width: 600px) {
				padding: 10px;
				justify-content: center;
				gap: 0;
			}
		}

		.downloads-menu {
			position: fixed;
			top: auto;
			bottom: auto;
			right: auto;
			left: auto;
			width: 320px;
			transform-origin: top left;
			z-index: 1001;
		}
	}
}
</style>
