<template>
	<div class="feed-post">
		<div class="post-profile">
			<NuxtLink :to="profileLink" class="profile-link">
				<img :src="post.profile.photo" :alt="post.profile.name" class="profile-photo" />
				<span class="profile-name">{{ post.profile.name }}</span>
			</NuxtLink>
			<span class="post-time">{{ formatTime }}</span>
		</div>

		<div v-if="post.text" class="post-text">{{ post.text }}</div>

		<div v-if="post.type === 'audio' && post.audios" class="post-audios">
			<Song
				v-for="audio in post.audios"
				:key="audio.full_id"
				:audio="audio"
			/>
		</div>

		<div v-else-if="post.type === 'audio_playlist' && post.playlist" class="post-playlist">
			<PlaylistMiniature
				:playlist="post.playlist"
				:show-play-button="true"
			/>
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

const props = defineProps<{
	post: TFeedPost;
}>();

const profileLink = computed(() => {
	return `/collection?owner_id=${props.post.profile.id}`;
});

const formatTime = computed(() => {
	const time = new Date(props.post.time * 1000);
	return time.toLocaleString("ru-RU", {
		day: "numeric",
		month: "short",
		hour: "2-digit",
		minute: "2-digit"
	});
});
</script>

<style scoped lang="scss">
.feed-post {
	padding: 16px;
	border-bottom: 1px solid var(--border, #2a2a2a);

	&:last-child {
		border-bottom: none;
	}
}

.post-profile {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 12px;
}

.profile-link {
	display: flex;
	align-items: center;
	gap: 10px;
	text-decoration: none;
	color: var(--text, #fff);
}

.profile-photo {
	width: 40px;
	height: 40px;
	border-radius: 50%;
	object-fit: cover;
}

.profile-name {
	font-weight: 600;
	font-size: 14px;

	&:hover {
		color: var(--secondary, #e9003f);
	}
}

.post-time {
	font-size: 12px;
	color: var(--text-secondary, #b3b3b3);
}

.post-text {
	margin-bottom: 12px;
	white-space: pre-line;
	color: var(--text, #fff);
	line-height: 1.5;
}

.post-audios,
.post-playlist {
	margin-top: 12px;
}
</style>


