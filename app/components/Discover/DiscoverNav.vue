<template>
	<div id="discover-navigation" class="discover-nav">
		<NuxtLink
			v-for="item of navigation"
			:key="item.id"
			:to="item.link"
			class="nav-item"
			:class="{ active: isActive(item.id) }"
		>
			<Icon :name="item.icon" size="20" />
			<span class="nav-item-text">{{ item.title }}</span>
		</NuxtLink>
	</div>
</template>

<script setup lang="ts">
const route = useRoute();

const navigation = [
	{
		id: "friends",
		link: "/discover/friends",
		icon: "mdi:account-group",
		title: "Друзья"
	},
	{
		id: "communities",
		link: "/discover/communities",
		icon: "mdi:account-multiple",
		title: "Сообщества"
	}
];

const isActive = (id: string): boolean => {
	const path = route.path;
	return path.includes(`/discover/${id}`);
};
</script>

<style scoped lang="scss">
.discover-nav {
	display: flex;
	gap: 8px;
	padding: 10px;
	background-color: var(--bg-secondary, #181818);
	border-bottom: 1px solid var(--border, #2a2a2a);
	position: sticky;
	top: 0;
	z-index: 998;
	overflow-x: auto;
	-webkit-overflow-scrolling: touch;
	scrollbar-width: none;
	-ms-overflow-style: none;

	&::-webkit-scrollbar {
		display: none;
	}

	@media (max-width: 768px) {
		padding: 8px;
		gap: 6px;
	}

	@media (max-width: 480px) {
		padding: 6px;
		gap: 4px;
	}
}

.nav-item {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 8px 16px;
	border-radius: 8px;
	text-decoration: none;
	color: var(--text-secondary, #b3b3b3);
	transition: all 0.2s;
	font-size: 14px;
	font-weight: 500;
	flex-shrink: 0;

	@media (max-width: 768px) {
		padding: 8px 12px;
		gap: 6px;
		font-size: 13px;
	}

	@media (max-width: 480px) {
		padding: 8px;
		gap: 0;
		justify-content: center;
		min-width: 44px;
	}

	&:hover {
		background-color: var(--bg-hover, #2a2a2a);
		color: var(--text, #fff);
	}

	&.active {
		background-color: var(--bg-hover, #2a2a2a);
		color: var(--text, #fff);
	}
}

.nav-item-text {
	white-space: nowrap;

	@media (max-width: 480px) {
		display: none;
	}
}
</style>


