<template>
	<div class="page" id="feed-page">
		<div v-if="loading" class="loading">
			<LoadingSpinner />
		</div>

		<div v-else-if="error" class="error">
			{{ error }}
		</div>

		<div v-else class="content">
			<h1>Лента</h1>
			<div class="posts-list">
				<div v-for="post in posts" :key="post.id" class="post-item">
					<!-- TODO: Implement post component -->
					<div class="post-content">
						{{ post.text || "Пост" }}
					</div>
				</div>
			</div>

			<div v-if="hasMore" class="load-more" ref="loadMoreRef">
				<button @click="loadMore" :disabled="loadingMore">
					Загрузить еще
				</button>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
// TODO: Implement feed API endpoint
const posts = ref<any[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const hasMore = ref(false);
const loadingMore = ref(false);
const loadMoreRef = ref<HTMLElement | null>(null);

const loadMore = async () => {
	// TODO: Implement load more
};
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

.posts-list {
	display: flex;
	flex-direction: column;
	gap: 20px;
}

.post-item {
	padding: 20px;
	border: 1px solid #ddd;
	border-radius: 8px;
}

.load-more {
	text-align: center;
	padding: 20px;

	button {
		padding: 10px 20px;
		background: #007bff;
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;

		&:hover:not(:disabled) {
			background: #0056b3;
		}

		&:disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}
	}
}
</style>

