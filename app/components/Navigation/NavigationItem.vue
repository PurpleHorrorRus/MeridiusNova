<template>
	<NuxtLink
		class="nav-chip"
		:class="{ active: isActive }"
		:to="item.link"
	>
		<span
			class="nav-chip__label"
			v-text="item.title"
		/>
	</NuxtLink>
</template>

<script setup lang="ts">
interface NavigationItem {
	id: string;
	title: string;
	link: string;
	icon?: string;
}

const props = defineProps<{
	item: NavigationItem;
}>();

const route = useRoute();
const isActive = computed(() => {
	const currentPath = route.path;
	const itemPath = props.item.link.split("?")[0];
	
	if (props.item.id === "music") {
		return currentPath === itemPath || (currentPath.endsWith("/-1") && !currentPath.includes("/playlists") && !currentPath.includes("/wall"));
	}
	
	return currentPath === itemPath || currentPath.startsWith(itemPath);
});
</script>

<style scoped lang="scss">
.nav-chip {
	display: inline-flex;
	align-items: center;
	padding: 8px 16px;
	border-radius: 20px;
	text-decoration: none;
	transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
	font-size: 14px;
	font-weight: 500;
	white-space: nowrap;
	background: transparent;
	border: 1px solid transparent;
	color: var(--text-secondary, #b3b3b3);

	&:link,
	&:visited,
	&:hover,
	&:active {
		text-decoration: none;
		color: inherit;
	}

	&:hover {
		color: var(--text, #fff);
		background: var(--bg-hover, #2a2a2a);
		border-color: var(--border, #282828);
	}

	&.nuxt-link-exact-active,
	&.active {
		background: var(--secondary, #e9003f);
		color: var(--text, #fff);
		border-color: var(--secondary, #e9003f);
	}

	&__label {
		line-height: 1;
	}
}
</style>

