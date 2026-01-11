<template>
	<div class="wall-social" @click.stop="handleLike">
		<div class="wall-social-like" :class="{ 'is-liked': isLiked }">
			<Icon name="mdi:heart" size="13" class="like-icon" />
			<span v-if="post.likes?.count" class="like-count">{{ post.likes.count }}</span>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed } from "vue";

interface WallPost {
	owner_id: number;
	post_id: number;
	likes?: {
		count: number;
		user_likes?: number;
	};
}

const props = defineProps<{
	post: WallPost;
}>();

const isLiked = computed(() => {
	return (props.post.likes?.user_likes || 0) > 0;
});

const handleLike = async () => {
	const isAdd = !isLiked.value;
	const method = isAdd ? "likes.add" : "likes.delete";

	await $fetch("/api/vk/call", {
		method: "POST",
		body: {
			method,
			params: {
				type: "post",
				owner_id: props.post.owner_id,
				item_id: props.post.post_id
			},
			methodType: "POST"
		}
	}).catch(() => {
		// Ignore errors
	});

	if (props.post.likes) {
		props.post.likes.count = (props.post.likes.count || 0) + (isAdd ? 1 : -1);
		props.post.likes.user_likes = isAdd ? 1 : 0;
	}
};
</script>

<style scoped lang="scss">
.wall-social {
	display: block;
	width: max-content;
	margin: 10px;
	font-size: 11px;
	cursor: pointer;
}

.wall-social-like {
	display: flex;
	align-items: center;
	gap: 5px;

	.like-icon {
		color: var(--text-secondary, #b3b3b3);
		transition: color 0.2s;
	}

	.like-count {
		color: var(--text-secondary, #b3b3b3);
		font-size: 11px;
		transition: color 0.2s;
	}

	&.is-liked {
		.like-icon {
			color: var(--secondary, #e9003f);
		}

		.like-count {
			color: var(--secondary, #e9003f);
		}
	}
}
</style>

