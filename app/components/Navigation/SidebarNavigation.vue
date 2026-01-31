<template>
	<nav class="sidebar-nav">
		<div class="nav-section">
			<div class="nav-section-header">
				<span class="nav-section-title" v-text="getString('navigation.myLibrary')" />
				<button
					class="nav-section-header-button"
					@click.stop="toggleLibraryExpanded"
					:class="{ expanded: libraryExpanded }"
				>
					<Icon
						:name="libraryExpanded ? 'mdi:chevron-down' : 'mdi:chevron-right'"
						size="16"
					/>
				</button>
			</div>
			<div v-if="libraryExpanded" class="nav-section-items">
				<NuxtLink
					v-for="item in libraryItems"
					:key="item.path"
					:to="item.path"
					class="nav-item"
					active-class="active"
					:exact-active-class="item.path === '/general' ? 'active' : undefined"
					:class="{ active: getCustomActive(item.path) }"
				>
					<Icon :name="item.icon" size="20" />
					<span class="nav-item-text" v-text="item.label" />
				</NuxtLink>
			</div>
		</div>

		<div class="nav-section nav-section-playlists">
			<div class="nav-section-header">
				<span class="nav-section-title" v-text="getString('navigation.playlists')" />
				<div class="nav-section-header-actions">
					<button
						class="nav-section-header-button"
						@click.stop="handleCreatePlaylist"
						title="Создать плейлист"
					>
						<Icon name="mdi:plus" size="16" />
					</button>
					<button
						class="nav-section-header-button"
						@click.stop="togglePlaylistsExpanded"
						:class="{ expanded: playlistsExpanded }"
						title="Раскрыть список"
					>
						<Icon
							:name="playlistsExpanded ? 'mdi:chevron-down' : 'mdi:chevron-right'"
							size="16"
						/>
					</button>
				</div>
			</div>
			<SidebarPlaylists
				:expanded="playlistsExpanded"
				:playlists="userPlaylists"
				:playlist-playing-states="playlistPlayingStates"
				:playlist-loading-states="playlistLoadingStates"
				@playlist-play="$emit('playlist-play', $event)"
			/>
		</div>
	</nav>
</template>

<script setup lang="ts">
import SidebarPlaylists from "~/components/Navigation/SidebarPlaylists.vue";
import CreatePlaylistModal from "~/components/Modals/CreatePlaylistModal.vue";

import { useVkStore } from "~/stores/vk";
import { useModalStore } from "~/stores/modal";

const { getString } = useStrings();
const route = useRoute();
const vkStore = useVkStore();
const settingsStore = useSettingsStore();
const { settings } = storeToRefs(settingsStore);
const modalStore = useModalStore();

const props = defineProps<{
	userPlaylists: any[];
	playlistsExpanded: boolean;
	playlistPlayingStates: Record<string, boolean>;
	playlistLoadingStates: Record<string, boolean>;
}>();

const emit = defineEmits<{
	"update:playlistsExpanded": [value: boolean];
	"playlist-play": [playlist: any];
	"playlist-created": [];
}>();

const libraryExpanded = ref(true);
const userId = computed(() => vkStore.user_id || 0);

const libraryItems = computed(() => [
	{ path: "/general", label: getString("navigation.main"), icon: "mdi:home" },
	{ path: userId.value ? `/playlist/${userId.value}/-1` : "/auth", label: getString("navigation.myMusic"), icon: "mdi:music-box-multiple" },
	{ path: "/discover/feed", label: "Лента", icon: "mdi:wall" },
	{ path: "/discover/updates", label: "Обновления", icon: "mdi:rss" },
	{ path: "/discover/friends", label: "Друзья", icon: "mdi:account-group" },
	{ path: "/discover/communities", label: "Сообщества", icon: "mdi:account-multiple" }
]);

const getCustomActive = (path: string): boolean => {
	const currentPath = route.path;

	if (path === "/general" && currentPath === "/general") {
		return true;
	}

	if (path === "/discover/feed" && currentPath === "/discover") {
		return true;
	}

	if (path.startsWith("/playlist") && path.endsWith("/-1")) {
		return currentPath.startsWith("/playlist") && 
			route.params.playlist_id === "-1" && 
			Number(route.params.owner_id) === userId.value;
	}

	return false;
};

const toggleLibraryExpanded = async () => {
	libraryExpanded.value = !libraryExpanded.value;
	await settingsStore.updateSection("appearance", {
		sidebarLibraryExpanded: libraryExpanded.value
	} as any);
};

const togglePlaylistsExpanded = async () => {
	const newValue = !props.playlistsExpanded;
	emit("update:playlistsExpanded", newValue);
	await settingsStore.updateSection("appearance", {
		sidebarPlaylistsExpanded: newValue
	});
};

const handleCreatePlaylist = () => {
	modalStore.openCustom(CreatePlaylistModal, {}, {
		onConfirm: async () => {
			await vkStore.refreshPlaylists();
			emit("playlist-created");
		}
	});
};

onMounted(async () => {
	await settingsStore.load();
	libraryExpanded.value = Boolean((settings.value.appearance as any).sidebarLibraryExpanded ?? true);
});
</script>

<style scoped lang="scss">
.sidebar-nav {
	display: flex;
	flex-direction: column;
	padding: 10px 0;
	flex: 1;
	min-height: 0;
	gap: 16px;

	@media (max-width: 1000px) {
		padding: 8px 0;
		gap: 12px;
	}

	@media (max-width: 800px) {
		padding: 6px 0;
		gap: 10px;
	}

	@media (max-width: 600px) {
		padding: 6px 0;
		gap: 8px;
	}
}

.nav-section {
	display: flex;
	flex-direction: column;
}

.nav-section-playlists {
	flex: 1;
	min-height: 0;
	display: flex;
	flex-direction: column;
	overflow: hidden;
}

.nav-section-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 4px 12px 6px;
	margin-bottom: 2px;

	@media (max-width: 1000px) {
		padding: 4px 10px 5px;
	}

	@media (max-width: 800px) {
		padding: 3px 10px 4px;
	}

	@media (max-width: 600px) {
		padding: 3px 8px 4px;
	}
}

.nav-section-title {
	font-size: 11px;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.08em;
	color: var(--text-tertiary, #6b6b6b);

	@media (max-width: 800px) {
		font-size: 10px;
	}

	@media (max-width: 600px) {
		font-size: 9px;
	}
}

.nav-section-header-actions {
	display: flex;
	align-items: center;
	gap: 2px;
}

.nav-section-header-button {
	background: transparent;
	border: none;
	cursor: pointer;
	padding: 4px;
	color: var(--text-tertiary, #6b6b6b);
	display: flex;
	align-items: center;
	justify-content: center;
	transition: opacity 0.2s ease, color 0.2s ease;
	border-radius: 4px;
	opacity: 0.8;

	&:hover {
		color: var(--text-secondary, #b3b3b3);
		opacity: 1;
	}

	&.expanded {
		color: var(--text-secondary, #b3b3b3);
		opacity: 1;
	}
}

.nav-section-items {
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.nav-item {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 8px 12px;
	margin: 0 8px;
	color: var(--text-secondary, #b3b3b3);
	text-decoration: none;
	transition: color 0.2s ease, opacity 0.2s ease, background-color 0.2s ease;
	position: relative;
	width: calc(100% - 16px);
	box-sizing: border-box;
	font-size: 13px;
	border-radius: 6px;

	@media (max-width: 1000px) {
		padding: 6px 10px;
		margin: 0 6px;
		width: calc(100% - 12px);
		gap: 10px;
		font-size: 12px;
	}

	@media (max-width: 800px) {
		padding: 5px 10px;
		margin: 0 6px;
		gap: 8px;
		font-size: 11px;
	}

	@media (max-width: 600px) {
		padding: 8px 10px;
		margin: 0 6px;
		width: calc(100% - 12px);
		justify-content: center;
		gap: 0;
	}

	&:hover:not(.active):not(.nuxt-link-active) {
		color: var(--text, #fff);
		background: var(--bg-hover, #252525);
	}

	&.nuxt-link-active,
	&.active {
		color: var(--text, #fff);
		background: var(--bg-hover, #252525);

		&::before {
			content: "";
			position: absolute;
			left: 0;
			top: 6px;
			bottom: 6px;
			width: 3px;
			background: var(--secondary, #e9003f);
			border-radius: 0 2px 2px 0;
		}
	}
}

.nav-item-text {
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;

	@media (max-width: 600px) {
		display: none;
	}
}
</style>

