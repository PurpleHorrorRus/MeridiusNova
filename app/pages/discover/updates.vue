<template>
	<div class="page" id="updates-page">
		<DiscoverNav />
		
		<div v-if="pending || !data" class="content">
			<div class="updates-list">
				<SkeletonUpdate v-for="i in 5" :key="i" />
			</div>
		</div>

		<div v-else-if="error && !data" class="error">
			{{ error }}
		</div>

		<div v-else class="content">
			<div v-if="updates.length === 0" class="empty-state">
				<p>Нет обновлений</p>
			</div>
			
			<div v-else class="updates-list">
				<DiscoverUpdate
					v-for="update in updates"
					:key="update.item.id"
					:update="update"
				/>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
type TUpdate = {
	item: {
		id: number;
		name: string;
		photo_max?: string;
		first_name?: string;
		last_name?: string;
	};
	audios: any[];
};

const { data, pending, error } = useLazyFetch<TUpdate[]>("/api/vk/discover/updates", {
	server: false
});

const updates = computed(() => {
	return data.value || [];
});
</script>

<style scoped lang="scss">
.page {
	padding: 20px;
}

.error {
	text-align: center;
	padding: 40px;
}

.content {
	display: flex;
	flex-direction: column;
	gap: 20px;
}

h1 {
	font-size: 32px;
	font-weight: 700;
}

.updates-list {
	display: flex;
	flex-direction: column;
	gap: 20px;
}

.update-item {
	padding: 20px;
	border: 1px solid #ddd;
	border-radius: 8px;
}
</style>

