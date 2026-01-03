<template>
	<div class="page" id="feed-page">
		<DiscoverNav />
		
		<div v-if="pending || !data" class="content">
			<div class="posts-list">
				<SkeletonFeedPost v-for="i in 5" :key="i" />
			</div>
		</div>

		<div v-else-if="error && !data" class="error">
			{{ error }}
		</div>

		<div v-else class="content">
			<div v-if="posts.length === 0" class="empty-state">
				<p>Нет постов с аудио</p>
			</div>
			
			<div v-else class="posts-list">
				<FeedPost
					v-for="post in posts"
					:key="post.post_id"
					:post="post"
				/>
			</div>

			<div v-if="hasMore" class="load-more" ref="loadMoreRef">
				<button @click="loadMore" :disabled="loadingMore">
					{{ loadingMore ? "Загрузка..." : "Загрузить еще" }}
				</button>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
type TFeedPost = {
	post_id: number;
	type: "audio" | "audio_playlist";
	profile: {
		id: number;
		name: string;
		photo: string;
	};
	time: number;
	likes?: {
		count: number;
	};
	reposts?: {
		count: number;
	};
	text: string;
	audios?: any[];
	playlist?: {
		raw_id: string;
		owner_id: number;
		playlist_id: number;
		title: string;
		cover: string;
		list: any[];
	};
};

type TFeedResponse = {
	posts: TFeedPost[];
	next_from: string;
};

const posts = ref<TFeedPost[]>([]);
const nextFrom = ref<string>("");
const loadingMore = ref(false);
const loadMoreRef = ref<HTMLElement | null>(null);

const { data, pending, error, refresh } = useLazyFetch<TFeedResponse>("/api/vk/discover/feed", {
	server: false
});

watch(data, (newData) => {
	if (newData) {
		posts.value = newData.posts;
		nextFrom.value = newData.next_from;
	}
}, { immediate: true });

const hasMore = computed(() => {
	return nextFrom.value.length > 0;
});

const loadMore = async () => {
	if (loadingMore.value || !hasMore.value) {
		return;
	}

	loadingMore.value = true;

	const response = await $fetch<TFeedResponse>("/api/vk/discover/feed", {
		query: {
			start_from: nextFrom.value
		}
	});

	posts.value = posts.value.concat(response.posts);
	nextFrom.value = response.next_from;
	loadingMore.value = false;
};

onMounted(() => {
	if (loadMoreRef.value) {
		const observer = new IntersectionObserver((entries) => {
			if (entries[0].isIntersecting && hasMore.value && !loadingMore.value) {
				loadMore();
			}
		});

		observer.observe(loadMoreRef.value);
	}
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

