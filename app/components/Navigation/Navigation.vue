<template>
	<div
		v-if="nav.length > 0"
		id="collection-navigation"
		class="navigation-chips"
	>
		<NavigationItem
			v-for="item of nav"
			:key="item.id"
			:item="item"
		/>
	</div>
</template>

<script setup lang="ts">
interface NavigationItem {
	id: string;
	title: string;
	link: string;
	icon?: string;
}

const { getString, strings } = useStrings();
const route = useRoute();

const ownerId = computed(() => {
	if (route.params.owner_id) {
		return String(route.params.owner_id);
	}
	return "";
});

const basePath = computed(() => {
	if (ownerId.value) {
		return `/playlist/${ownerId.value}/-1`;
	}
	return "";
});

// Получаем информацию о том, что библиотека скрыта
const isCollectionRestricted = inject<Ref<boolean>>("isCollectionRestricted", ref(false));

const nav = computed<NavigationItem[]>(() => {
	if (!basePath.value) {
		return [];
	}

	// Зависимость от strings для реактивности
	const _ = strings;

	const items: NavigationItem[] = [
		{
			id: "music",
			title: getString("collection.tabs.music"),
			link: basePath.value,
			icon: "mdi:music-box-multiple"
		}
	];

	// Скрываем вкладку плейлистов, если библиотека скрыта
	if (!isCollectionRestricted.value) {
		items.push({
			id: "playlists",
			title: getString("collection.tabs.playlists"),
			link: `${basePath.value}/playlists`,
			icon: "mdi:playlist-music"
		});
	}

	items.push({
		id: "wall",
		title: getString("collection.tabs.wall"),
		link: `${basePath.value}/wall`,
		icon: "mdi:wall"
	});

	return items;
});
</script>

<style scoped lang="scss">
.navigation-chips {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
	align-items: center;
	padding: 24px 32px;

	@media (max-width: 768px) {
		padding: 16px 20px;
	}

	@media (max-width: 480px) {
		padding: 12px 16px;
	}
}
</style>

