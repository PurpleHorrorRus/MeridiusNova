<template>
	<div class="page" id="updates-page">
		<div v-if="loading" class="loading">
			<LoadingSpinner />
		</div>

		<div v-else-if="error" class="error">
			{{ error }}
		</div>

		<div v-else class="content">
			<h1>Обновления</h1>
			<div class="updates-list">
				<div v-for="update in updates" :key="update.id" class="update-item">
					<div class="update-content">
						{{ update.text || "Обновление" }}
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
// TODO: Implement updates API endpoint
const updates = ref<any[]>([]);
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

