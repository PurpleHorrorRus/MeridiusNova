<template>
	<div
		v-if="nav.length > 0"
		id="collection-navigation"
		class="cg-10"
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

const { getString } = useStrings();
const route = useRoute();

const ownerId = computed(() => {
	const ownerIdParam = route.query.owner_id as string;
	return ownerIdParam || "";
});

const basePath = computed(() => {
	if (ownerId.value) {
		return `/collection?owner_id=${ownerId.value}`;
	}
	return "/collection";
});

const nav = computed<NavigationItem[]>(() => {
	return [
		{
			id: "music",
			title: getString("collection.tabs.music"),
			link: basePath.value,
			icon: "mdi:music-box-multiple"
		},
		{
			id: "playlists",
			title: getString("collection.tabs.playlists"),
			link: `${basePath.value}/playlists`,
			icon: "mdi:playlist-music"
		},
		{
			id: "albums",
			title: getString("collection.tabs.albums"),
			link: `${basePath.value}/albums`,
			icon: "mdi:album"
		}
	];
});
</script>

<style scoped lang="scss">
#collection-navigation {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 0 10px;

	.icon path {
		fill: var(--text, #fff);
	}
}
</style>

