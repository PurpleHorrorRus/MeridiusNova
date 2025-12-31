<template>
	<div class="page" id="communities-page">
		<div v-if="loading" class="loading">
			<LoadingSpinner />
		</div>

		<div v-else-if="error" class="error">
			{{ error }}
		</div>

		<div v-else class="content">
			<h1>Сообщества</h1>
			<div class="communities-list">
				<div v-for="community in communities" :key="community.id" class="community-item">
					<img v-if="community.avatar" :src="community.avatar" :alt="community.name" class="community-avatar" />
					<div class="community-info">
						<span class="community-name">{{ community.name }}</span>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
// TODO: Implement communities API endpoint
const communities = ref<any[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
</script>

<style scoped lang="scss">
.page {
	padding: 20px;
}

.loading,
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

.communities-list {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
	gap: 20px;
}

.community-item {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 10px;
	padding: 15px;
	border: 1px solid #ddd;
	border-radius: 8px;
}

.community-avatar {
	width: 100px;
	height: 100px;
	border-radius: 50%;
	object-fit: cover;
}

.community-name {
	font-weight: 600;
}
</style>

