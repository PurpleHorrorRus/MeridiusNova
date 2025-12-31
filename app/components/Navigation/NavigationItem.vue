<template>
	<NuxtLink
		class="navigation-item"
		:class="{ active: isActive }"
		:to="item.link"
	>
		<Icon
			v-if="item.icon"
			:name="item.icon"
			size="16"
			class="icon"
		/>

		<span
			class="navigation-item__label"
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
		return currentPath === itemPath || (currentPath === "/collection" && !route.path.includes("/playlists"));
	}
	
	return currentPath === itemPath || currentPath.startsWith(itemPath);
});
</script>

<style scoped lang="scss">
.navigation-item {
	display: flex;
	justify-content: center;
	align-items: center;
	column-gap: 5px;

	width: max-content;
	height: 30px;

	padding: 15px 10px;

	border-bottom: 2px solid transparent;

	transition: border-bottom 0.2s ease-in;

	&.nuxt-link-exact-active,
	&.active {
		border-bottom: 2px solid var(--secondary, #e9003f);
	}

	&:not(.nuxt-link-exact-active):not(.active) {
		&:hover {
			cursor: pointer;
			border-bottom: 2px solid var(--secondary-hover-opacity, rgba(233, 0, 63, 0.5));
		}
	}

	.icon {
		width: 16px;
		height: 16px;
		color: var(--text, #fff);
	}

	&__label {
		font-size: 13px;
		font-weight: 500;
		color: var(--text, #fff);
	}
}
</style>

