<template>
	<nav class="sidebar-nav">
		<template v-for="item in navigationItems" :key="item.path">
			<NuxtLink
				v-if="item.path !== (userId ? `/playlist/${userId}/-1` : '/auth')"
				:to="item.path"
				class="nav-item"
				active-class="active"
				:exact-active-class="item.path === '/general' ? 'active' : undefined"
				:class="{ active: getCustomActive(item.path) }"
			>
				<Icon :name="item.icon" size="24" />
				<span class="nav-item-text">{{ item.label }}</span>
			</NuxtLink>
			<div v-else class="nav-item-group">
				<div class="nav-item-wrapper">
					<NuxtLink
						:to="item.path"
						class="nav-item"
						:class="{ active: isAnyPlaylistActive || getCustomActive(item.path) }"
					>
						<Icon :name="item.icon" size="24" />
						<span class="nav-item-text">{{ item.label }}</span>
					</NuxtLink>
					<button
						v-if="userPlaylists.length > 0"
						@click.stop="togglePlaylistsExpanded"
						class="nav-item-toggle-button"
						:class="{ expanded: playlistsExpanded }"
					>
						<Icon
							:name="playlistsExpanded ? 'mdi:chevron-down' : 'mdi:chevron-right'"
							size="20"
							class="nav-item-chevron"
						/>
					</button>
				</div>
				<SidebarPlaylists
					:expanded="playlistsExpanded"
					:playlists="userPlaylists"
					:playlist-playing-states="playlistPlayingStates"
					:playlist-loading-states="playlistLoadingStates"
					@playlist-play="$emit('playlist-play', $event)"
				/>
			</div>
		</template>
	</nav>
</template>

<script setup lang="ts">
import { useVkStore } from "~/stores/vk";
import { usePlaylist } from "~/composables/usePlaylist";
import { usePlayerStore } from "~/stores/player";
import SidebarPlaylists from "~/components/Navigation/SidebarPlaylists.vue";

const { getString } = useStrings();
const route = useRoute();
const vkStore = useVkStore();
const { settings, updateSection } = useSettings();
const { playPlaylist, playing } = usePlaylist();
const playerStore = usePlayerStore();

const props = defineProps<{
	userPlaylists: any[];
	playlistsExpanded: boolean;
	playlistPlayingStates: Record<string, boolean>;
	playlistLoadingStates: Record<string, boolean>;
}>();

const emit = defineEmits<{
	"update:playlistsExpanded": [value: boolean];
	"playlist-play": [playlist: any];
}>();

const userId = computed(() => vkStore.user_id || 0);

const navigationItems = computed(() => [
	{ path: "/general", label: getString("navigation.main"), icon: "mdi:home" },
	{ path: userId.value ? `/playlist/${userId.value}/-1` : "/auth", label: getString("navigation.myMusic"), icon: "mdi:music-box-multiple" },
	{ path: "/discover/feed", label: "Лента", icon: "mdi:wall" },
	{ path: "/discover/updates", label: "Обновления", icon: "mdi:rss" },
	{ path: "/discover/friends", label: "Друзья", icon: "mdi:account-group" },
	{ path: "/discover/communities", label: "Сообщества", icon: "mdi:account-multiple" }
]);


const isPlaylistActive = (playlist: any): boolean => {
	const isCurrentPage = route.path.startsWith("/playlist") &&
		Number(route.params.owner_id) === playlist.owner_id &&
		Number(route.params.playlist_id) === playlist.playlist_id;
	
	const currentPlaying = playing.value;
	const isCurrentlyPlaying = Boolean(currentPlaying && 
		currentPlaying.owner_id === playlist.owner_id &&
		currentPlaying.playlist_id === playlist.playlist_id &&
		!playerStore.paused);
	
	return isCurrentPage || isCurrentlyPlaying;
};

const isAnyPlaylistActive = computed(() => {
	return props.userPlaylists.some(playlistItem => isPlaylistActive(playlistItem));
});

const getCustomActive = (path: string): boolean => {
	const currentPath = route.path;

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

const togglePlaylistsExpanded = async () => {
	const newValue = !props.playlistsExpanded;
	emit("update:playlistsExpanded", newValue);
	await updateSection("appearance", {
		sidebarPlaylistsExpanded: newValue
	});
};
</script>

<style scoped lang="scss">
.sidebar-nav {
	display: flex;
	flex-direction: column;
	padding: 10px 0;
	flex: 1;

	@media (max-width: 1000px) {
		padding: 8px 0;
	}

	@media (max-width: 800px) {
		padding: 6px 0;
	}

	@media (max-width: 600px) {
		padding: 4px 0;
	}
}

.nav-item {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 12px 20px;
	padding-right: 48px;
	color: var(--text-secondary, #b3b3b3);
	text-decoration: none;
	transition: all 0.2s;
	position: relative;
	width: 100%;
	border-radius: 0 8px 8px 0;
	margin-right: 8px;

	@media (max-width: 1000px) {
		padding: 10px 16px;
		padding-right: 44px;
		gap: 10px;
	}

	@media (max-width: 800px) {
		padding: 8px 12px;
		padding-right: 40px;
		gap: 8px;
	}

	@media (max-width: 600px) {
		padding: 10px;
		padding-right: 48px;
		justify-content: center;
		gap: 0;
		border-left: none;
		border-top: 2px solid transparent;
	}

	&:hover:not(.active):not(.nuxt-link-active) {
		background: var(--hover, #2a2a2a);
		color: var(--text, #fff);
	}

	&.nuxt-link-active,
	&.active {
		color: var(--text, #fff);
		background: linear-gradient(90deg, rgba(233, 0, 63, 0.2) 0%, rgba(233, 0, 63, 0.1) 100%);
		border-left-color: var(--secondary, #e9003f);
		margin-right: 0;
		border-radius: 0;
	}

	&.nuxt-link-active:hover,
	&.active:hover {
		background: linear-gradient(90deg, rgba(233, 0, 63, 0.25) 0%, rgba(233, 0, 63, 0.15) 100%);
	}
}

.nav-item-group .nav-item {
	&.nuxt-link-active,
	&.active {
		border-left: none;
	}

	&:hover:not(.active):not(.nuxt-link-active) {
		background: transparent;
	}
}

.nav-item-group {
	display: flex;
	flex-direction: column;
}

.nav-item-wrapper {
	display: flex;
	align-items: center;
	position: relative;
	width: 100%;
	transition: background 0.2s;

	&:hover:not(:has(.nav-item.active)):not(:has(.nav-item.nuxt-link-active)) {
		background: var(--hover, #2a2a2a);

		.nav-item {
			color: var(--text, #fff);
		}
	}
}

.nav-item-toggle-button {
	position: absolute;
	right: 8px;
	background: transparent;
	border: none;
	cursor: pointer;
	padding: 8px;
	color: var(--text-secondary, #b3b3b3);
	display: flex;
	align-items: center;
	justify-content: center;
	transition: color 0.2s ease;
	border-radius: 4px;
	z-index: 2;
	pointer-events: auto;

	@media (max-width: 1000px) {
		right: 6px;
		padding: 6px;
	}

	@media (max-width: 800px) {
		right: 4px;
		padding: 5px;
	}

	@media (max-width: 600px) {
		right: 8px;
		padding: 8px;
	}

	.nav-item-wrapper:hover & {
		color: var(--text, #fff);
		background: transparent;
	}

	&:hover {
		background: transparent;
	}

	&.expanded .nav-item-chevron {
		color: var(--secondary, #e9003f);
	}
}

.nav-item-chevron {
	color: var(--text-secondary, #b3b3b3);
	transition: transform 0.2s ease, color 0.2s;
	flex-shrink: 0;
}
</style>

