<template>
	<div class="sidebar-search" :class="{ 'sidebar-search-hidden': showSearchInTitlebar }">
		<div class="search-input-wrapper">
			<Icon name="mdi:magnify" size="20" class="search-icon" />
			<input
				v-model="searchQuery"
				type="text"
				:placeholder="getString('search.placeholder')"
				class="search-input"
				@keydown.enter="handleSearchKeydown"
			/>
			<button
				v-if="searchQuery"
				@click="clearSearch"
				class="search-clear"
			>
				<Icon name="mdi:close" size="16" />
			</button>
		</div>
	</div>
</template>

<script setup lang="ts">
const { getString } = useStrings();

const props = defineProps<{
	showSearchInTitlebar: boolean;
}>();

const searchQuery = ref("");

const handleSearchKeydown = (event: KeyboardEvent) => {
	if (event.key === "Enter") {
		const query = searchQuery.value.trim();
		if (query.length > 0) {
			navigateTo(`/search?q=${encodeURIComponent(query)}`);
		}
	}
};
</script>

<style scoped lang="scss">
.sidebar-search {
	position: relative;
	padding: 10px 20px;
	border-bottom: 1px solid var(--border, #2a2a2a);

	@media (max-width: 1000px) {
		padding: 8px 16px;
	}

	@media (max-width: 800px) {
		padding: 6px 12px;
	}

	@media (max-width: 600px) {
		display: none;
	}

	&.sidebar-search-hidden {
		display: none;
	}
}

.search-input-wrapper {
	position: relative;
	display: flex;
	align-items: center;
	background: var(--bg-tertiary, #2a2a2a);
	border-radius: 6px;
	padding: 8px 12px;
	gap: 8px;

	@media (max-width: 1000px) {
		padding: 6px 10px;
		gap: 6px;
	}

	@media (max-width: 800px) {
		padding: 5px 8px;
		gap: 5px;
	}

	@media (max-width: 600px) {
		padding: 8px;
		width: 48px;
		justify-content: center;
	}
}

.search-icon {
	color: var(--text-secondary, #b3b3b3);
	flex-shrink: 0;
}

.search-input {
	flex: 1;
	min-width: 0;
	background: transparent;
	border: none;
	outline: none;
	color: var(--text, #fff);
	font-size: 14px;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;

	@media (max-width: 1000px) {
		font-size: 13px;
	}

	@media (max-width: 800px) {
		font-size: 12px;
	}

	@media (max-width: 600px) {
		display: none;
	}

	&::placeholder {
		color: var(--text-secondary, #b3b3b3);
	}
}

.search-clear {
	background: none;
	border: none;
	cursor: pointer;
	padding: 4px;
	color: var(--text-secondary, #b3b3b3);
	display: flex;
	align-items: center;
	justify-content: center;
	transition: color 0.2s;

	&:hover {
		color: var(--text, #fff);
	}
}
</style>

