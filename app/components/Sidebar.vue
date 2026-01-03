<template>
	<div class="sidebar">
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
			/>

			<div class="sidebar-bottom-section">
				<SidebarSettingsButton />

				<SidebarUser :accounts="accounts" />
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { useVkStore } from "~/stores/vk";
import { useEventListener } from "~/composables/useEventListener";
import { usePlaylist } from "~/composables/usePlaylist";
import { usePlayerStore } from "~/stores/player";
import MobileBottomNav from "~/components/Navigation/MobileBottomNav.vue";
import SidebarSearch from "~/components/Navigation/SidebarSearch.vue";
import SidebarNavigation from "~/components/Navigation/SidebarNavigation.vue";
import SidebarSettingsButton from "~/components/Navigation/SidebarSettingsButton.vue";
import SidebarUser from "~/components/Navigation/SidebarUser.vue";
import { loadUserAccounts } from "~/utils/accounts";

const { playPlaylist } = usePlaylist();

const vkStore = useVkStore();
const { settings, load } = useSettings();
const { playing } = usePlaylist();
const playerStore = usePlayerStore();

const userId = computed(() => vkStore.user_id || 0);
const accounts = ref<any[]>([]);
const userPlaylists = ref<any[]>([]);
const playlistsExpanded = ref(false);
const playlistPlayingStates = ref<Record<string, boolean>>({});
const playlistLoadingStates = ref<Record<string, boolean>>({});

const windowWidth = ref(typeof window !== "undefined" ? window.innerWidth : 0);

const showSearchInTitlebar = computed(() => {
	return windowWidth.value <= 600;
});

const showBottomNavigation = computed(() => {
	return windowWidth.value <= 600;
});

if (typeof window !== "undefined") {
	const handleResize = () => {
		windowWidth.value = window.innerWidth;
	};

	useEventListener(window, "resize", handleResize);
}

const updatePlaylistStates = () => {
	userPlaylists.value.forEach(playlist => {
		const currentPlaying = playing.value;
		const isCurrent = currentPlaying && currentPlaying.raw_id === playlist.raw_id;
		playlistPlayingStates.value[playlist.raw_id] = Boolean(isCurrent && !playerStore.paused);
	});
};

const handlePlaylistPlay = async (playlist: any) => {
	const playlistRawId = playlist.raw_id;
	const currentPlaying = playing.value;
	const isCurrent = currentPlaying && currentPlaying.raw_id === playlistRawId;

	if (isCurrent && !playerStore.paused) {
		playerStore.pause();
		playlistPlayingStates.value[playlistRawId] = false;
	} else if (isCurrent && playerStore.paused) {
		playerStore.resume();
		playlistPlayingStates.value[playlistRawId] = true;
	} else {
		playlistLoadingStates.value[playlistRawId] = true;
		await playPlaylist(playlist).finally(() => {
			playlistLoadingStates.value[playlistRawId] = false;
		});
	}
};

watch([playing, () => playerStore.paused], () => {
	updatePlaylistStates();
}, { immediate: true });

watch(() => playerStore.isPlaying, () => {
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
	const accountIds = settings.value.vk.accounts.map(account => account.user).filter((id): id is number => typeof id === "number");
	const loadedAccounts = await loadUserAccounts(accountIds);
	accounts.value.push(...loadedAccounts);
};

onMounted(async () => {
	await load();
	await loadAccounts();
	playlistsExpanded.value = Boolean(settings.value.appearance.sidebarPlaylistsExpanded ?? false);
	await loadUserPlaylists();
});

watch(userId, async () => {
	playlistsExpanded.value = Boolean(settings.value.appearance.sidebarPlaylistsExpanded ?? false);
	await loadUserPlaylists();
});
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
	transition: width 0.3s ease;

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
}
</style>
