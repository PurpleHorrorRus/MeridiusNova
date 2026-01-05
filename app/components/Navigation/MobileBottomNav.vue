<template>
	<div class="mobile-bottom-nav">
		<NuxtLink
			v-for="item in navigationItems"
			:key="item.path"
			:to="item.path"
			class="bottom-nav-item"
			active-class="active"
			:exact-active-class="item.path === '/general' ? 'active' : undefined"
			:class="{ active: getCustomActive(item.path) }"
		>
			<Icon :name="item.icon" size="24" />
			<span class="bottom-nav-text">{{ item.label }}</span>
		</NuxtLink>
	</div>
</template>

<script setup lang="ts">
import { useVkStore } from "~/stores/vk";

const { getString } = useStrings();
const route = useRoute();
const vkStore = useVkStore();

const userId = computed(() => vkStore.user_id || 0);

const navigationItems = computed(() => [
	{ path: "/general", label: getString("navigation.main"), icon: "mdi:home" },
	{ path: userId.value ? `/playlist/${userId.value}/-1` : "/auth", label: getString("navigation.myMusic"), icon: "mdi:music-box-multiple" },
	{ path: "/search", label: "Поиск", icon: "mdi:magnify" },
	{ path: "/settings", label: getString("navigation.settings"), icon: "mdi:cog" }
]);

const getCustomActive = (path: string): boolean => {
	const currentPath = route.path;

	if (path === "/general") {
		return currentPath === "/general";
	}

	if (path === "/search") {
		return currentPath.startsWith("/search");
	}

	if (path.startsWith("/playlist") && path.endsWith("/-1")) {
		return currentPath.startsWith("/playlist") && 
			route.params.playlist_id === "-1" && 
			Number(route.params.owner_id) === userId.value;
	}

	if (path === "/settings") {
		return currentPath === "/settings";
	}

	return false;
};
</script>

<style scoped lang="scss">
.mobile-bottom-nav {
	display: flex;
	justify-content: space-around;
	align-items: center;
	position: fixed;
	bottom: 0;
	left: 0;
	right: 0;
	height: 60px;
	background: var(--bg-sidebar, #1a1a1a);
	border-top: 1px solid var(--border, #2a2a2a);
	z-index: 1001;
}

.bottom-nav-item {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 4px;
	color: var(--text-secondary, #b3b3b3);
	text-decoration: none;
	padding: 8px 0;
	transition: color 0.2s;
	flex: 1;
	text-align: center;
	position: relative;
	
	&.nuxt-link-active,
	&.active {
		color: var(--secondary, #e9003f);
		
		&::before {
			content: "";
			position: absolute;
			top: 0;
			left: 50%;
			transform: translateX(-50%);
			width: 40px;
			height: 3px;
			background: var(--secondary, #e9003f);
			border-radius: 0 0 3px 3px;
		}
	}
	
	&:hover:not(.active):not(.nuxt-link-active) {
		color: var(--text, #fff);
	}
}

.bottom-nav-text {
	font-size: 12px;
	font-weight: 500;
}
</style>

