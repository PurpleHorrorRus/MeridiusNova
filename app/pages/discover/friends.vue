<template>
	<div class="page" id="friends-page">
		<div v-if="loading" class="loading">
			<LoadingSpinner />
		</div>

		<div v-else-if="error" class="error">
			{{ error }}
		</div>

		<div v-else class="content">
			<h1>Друзья</h1>
			<div class="friends-list">
				<div v-for="friend in friends" :key="friend.id" class="friend-item">
					<img v-if="friend.avatar" :src="friend.avatar" :alt="friend.name" class="friend-avatar" />
					<div class="friend-info">
						<span class="friend-name">{{ friend.name }}</span>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
// TODO: Implement friends API endpoint
const friends = ref<any[]>([]);
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

.friends-list {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
	gap: 20px;
}

.friend-item {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 10px;
	padding: 15px;
	border: 1px solid #ddd;
	border-radius: 8px;
}

.friend-avatar {
	width: 100px;
	height: 100px;
	border-radius: 50%;
	object-fit: cover;
}

.friend-name {
	font-weight: 600;
}
</style>

