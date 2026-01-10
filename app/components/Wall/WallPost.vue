<template>
	<article class="wall-post">
		<div
			v-if="post.repostedFrom"
			class="wall-post-repost-header"
			@click="handleRepostClick"
		>
			<div class="wall-post-repost-content">
				<Icon name="mdi:share-variant" size="14" class="wall-post-repost-icon" />
				<img
					v-if="repostedFromOwner?.photo"
					:src="repostedFromOwner.photo"
					:alt="repostedFromOwner.name"
					class="wall-post-repost-avatar"
				/>
				<span v-if="repostedFromOwner" class="wall-post-repost-name">
					{{ repostedFromOwner.name }}
				</span>
				<span v-else class="wall-post-repost-name">
					Загрузка...
				</span>
			</div>
		</div>

		<div class="wall-post-header">
			<div class="wall-post-header-left">
				<WallPin v-if="post.isPinned" />
			</div>
			<div class="wall-post-header-right">
				<time v-if="post.time > 0" class="wall-post-time">
					{{ formatTime }}
				</time>
			</div>
		</div>

		<div v-if="post.text && post.text.length > 0" class="wall-post-content">
			<div class="wall-post-text">
				{{ post.text }}
			</div>
		</div>

		<div v-if="hasPhotos" class="wall-post-attachments" :class="getAttachmentsClass">
			<div
				v-for="(photo, index) in photos"
				:key="`wall-photo-${photo.id}-${index}`"
				class="wall-post-attachment wall-post-attachment-photo"
			>
				<div
					class="wall-post-photo"
					@click="openPhoto(photo)"
				>
					<img
						:src="getPhotoUrl(photo)"
						:alt="`Photo ${index + 1}`"
						loading="lazy"
					/>
				</div>
			</div>
		</div>

		<div v-if="hasAudios" class="wall-post-audios">
			<div
				v-for="audio in audios"
				:key="audio.full_id || audio.id"
				class="wall-post-audio-item"
			>
				<Song :audio="audio" />
			</div>
		</div>

		<WallPlaylist
			v-if="post.type === 'audio_playlist' && post.playlist"
			:playlist="post.playlist"
		/>

		<WallSocial
			v-if="showSocial"
			:post="post"
		/>
	</article>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";

import Song from "~/components/Song/Song.vue";
import WallPlaylist from "./WallPlaylist.vue";
import WallPin from "./WallPin.vue";
import WallSocial from "./WallSocial.vue";

import { useVkStore } from "~/stores/vk";

import type { TAudio } from "~~/server/api/vk/audio/types";
import type { TPlaylist } from "~~/server/utils/types";

type TOwnerInfo = {
	id: number;
	name: string;
	photo?: string;
	type: "user" | "group";
};

interface WallPhoto {
	id: number;
	owner_id: number;
	sizes?: Array<{
		type: string;
		url: string;
		width: number;
		height: number;
	}>;
	photo_75?: string;
	photo_130?: string;
	photo_604?: string;
	photo_807?: string;
	photo_1280?: string;
	photo_2560?: string;
}

interface WallPost {
	owner_id: number;
	post_id: number;
	type: "audio" | "audio_playlist";
	text: string;
	time: number;
	isPinned: boolean;
	audios?: TAudio[];
	playlist?: TPlaylist & {
		list?: TAudio[];
	};
	photos?: WallPhoto[];
	likes?: {
		count: number;
		user_likes?: number;
	};
	repostedFrom?: {
		owner_id: number;
		post_id: number;
	};
}

const props = defineProps<{
	post: WallPost;
}>();

const vkStore = useVkStore();
const ownerId = computed(() => {
	const route = useRoute();
	return Number(route.params.owner_id);
});

const repostedFromOwner = ref<TOwnerInfo | null>(null);

const loadRepostedFromOwner = async () => {
	if (!props.post.repostedFrom) {
		return;
	}

	const owner_id = props.post.repostedFrom.owner_id;
	
	const owner = await $fetch<TOwnerInfo>(`/api/vk/owner/${owner_id}`).catch(() => null);
	
	if (owner) {
		repostedFromOwner.value = owner;
	}
};

watch(() => props.post.repostedFrom, (repostedFrom) => {
	if (repostedFrom) {
		loadRepostedFromOwner();
	} else {
		repostedFromOwner.value = null;
	}
}, { immediate: true });

const handleRepostClick = () => {
	if (!props.post.repostedFrom || !repostedFromOwner.value) {
		return;
	}

	navigateTo(`/playlist/${props.post.repostedFrom.owner_id}/-1`);
};

const formatTime = computed(() => {
	const date = new Date(props.post.time * 1000);
	const now = new Date();
	const diff = now.getTime() - date.getTime();
	const days = Math.floor(diff / (1000 * 60 * 60 * 24));
	
	if (days === 0) {
		const hours = Math.floor(diff / (1000 * 60 * 60));
		if (hours === 0) {
			const minutes = Math.floor(diff / (1000 * 60));
			return minutes <= 1 ? "только что" : `${minutes} мин. назад`;
		}
		return `${hours} ч. назад`;
	}
	
	if (days === 1) {
		return "вчера";
	}
	
	if (days < 7) {
		return `${days} дн. назад`;
	}
	
	return date.toLocaleDateString("ru-RU", {
		day: "numeric",
		month: "long",
		year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined
	});
});

const showSocial = computed(() => {
	return props.post.owner_id === ownerId.value;
});

const photos = computed(() => {
	if (!props.post.photos || props.post.photos.length === 0) {
		return [];
	}
	return props.post.photos.slice(0, 10);
});

const hasPhotos = computed(() => {
	return photos.value.length > 0;
});

const audios = computed(() => {
	if (props.post.type === "audio" && props.post.audios && props.post.audios.length > 0) {
		return props.post.audios;
	}
	return [];
});

const hasAudios = computed(() => {
	return audios.value.length > 0;
});

const getAttachmentsClass = computed(() => {
	const photoCount = photos.value.length;
	if (photoCount === 1) {
		return "single";
	}
	if (photoCount === 2) {
		return "double";
	}
	if (photoCount === 3) {
		return "triple";
	}
	if (photoCount === 4) {
		return "quad";
	}
	if (photoCount <= 6) {
		return "multiple";
	}
	return "many";
});

const getPhotoUrl = (photo: WallPhoto): string => {
	if (photo.photo_2560) {
		return photo.photo_2560;
	}
	if (photo.photo_1280) {
		return photo.photo_1280;
	}
	if (photo.photo_807) {
		return photo.photo_807;
	}
	if (photo.photo_604) {
		return photo.photo_604;
	}
	if (photo.photo_130) {
		return photo.photo_130;
	}
	if (photo.photo_75) {
		return photo.photo_75;
	}
	if (photo.sizes && photo.sizes.length > 0) {
		const sortedSizes = [...photo.sizes].sort((a, b) => {
			const order = ["z", "y", "x", "w", "r", "q", "p", "o", "m", "s"];
			const aIndex = order.indexOf(a.type);
			const bIndex = order.indexOf(b.type);
			return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
		});
		return sortedSizes[0].url;
	}
	return "";
};

const openPhoto = (photo: WallPhoto) => {
	const url = getPhotoUrl(photo);
	if (url) {
		window.open(url, "_blank");
	}
};
</script>

<style scoped lang="scss">
.wall-post {
	display: flex;
	flex-direction: column;
	background: var(--bg-secondary, #181818);
	border-radius: 16px;
	padding: 20px;
	margin-bottom: 16px;
	border: 1px solid var(--border, #2a2a2a);
	transition: all 0.2s ease;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

	&:hover {
		border-color: var(--border-secondary, #3a3a3a);
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
	}
}

.wall-post-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 16px;
	padding-bottom: 12px;
	border-bottom: 1px solid var(--border, #2a2a2a);
}

.wall-post-header-left {
	display: flex;
	align-items: center;
	gap: 8px;
}

.wall-post-repost-header {
	display: flex;
	align-items: center;
	margin-bottom: 12px;
	padding: 8px 12px;
	background: var(--bg-tertiary, #0f0f0f);
	border-radius: 8px;
	border: 1px solid var(--border, #2a2a2a);
	cursor: pointer;
	transition: all 0.2s ease;

	&:hover {
		background: var(--bg-hover, #1a1a1a);
		border-color: var(--border-secondary, #3a3a3a);
	}
}

.wall-post-repost-content {
	display: flex;
	align-items: center;
	gap: 8px;
	width: 100%;
}

.wall-post-repost-icon {
	color: var(--text-tertiary, #6b6b6b);
	flex-shrink: 0;
}

.wall-post-repost-avatar {
	width: 20px;
	height: 20px;
	border-radius: 50%;
	object-fit: cover;
	flex-shrink: 0;
	background: var(--bg-secondary, #181818);
}

.wall-post-repost-name {
	font-size: 13px;
	color: var(--text-secondary, #b3b3b3);
	font-weight: 500;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.wall-post-header-right {
	display: flex;
	align-items: center;
}

.wall-post-time {
	font-size: 13px;
	color: var(--text-tertiary, #6b6b6b);
	font-weight: 400;
}

.wall-post-content {
	margin-bottom: 16px;
}

.wall-post-text {
	font-size: 15px;
	line-height: 1.6;
	color: var(--text, #fff);
	white-space: pre-wrap;
	word-wrap: break-word;
	letter-spacing: 0.01em;
}

.wall-post-attachments {
	display: grid;
	gap: 6px;
	margin-bottom: 16px;
	border-radius: 8px;
	overflow: hidden;

	&.single {
		grid-template-columns: 1fr;
		max-width: 550px;
	}

	&.double {
		grid-template-columns: repeat(2, 1fr);
		max-width: 500px;
	}

	&.triple {
		grid-template-columns: repeat(2, 1fr);
		grid-template-rows: repeat(2, 1fr);
		max-width: 500px;

		.wall-post-attachment:first-child {
			grid-row: 1 / 3;
		}
	}

	&.quad {
		grid-template-columns: repeat(4, 1fr);
		max-width: 1000px;
	}

	&.multiple {
		grid-template-columns: repeat(3, 1fr);
		max-width: 700px;
	}

	&.many {
		grid-template-columns: repeat(3, 1fr);
		max-width: 700px;
	}
}

.wall-post-attachment {
	position: relative;
	width: 100%;
	overflow: hidden;
	border-radius: 6px;
	background: var(--bg-tertiary, #0f0f0f);

	&.wall-post-attachment-photo {
		aspect-ratio: 1;
		cursor: pointer;
		transition: transform 0.2s ease, opacity 0.2s ease;

		&:hover {
			transform: scale(1.02);
			opacity: 0.9;
		}
	}

}

.wall-post-photo {
	position: relative;
	width: 100%;
	height: 100%;
	overflow: hidden;
	border-radius: 6px;

	img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}
}

.wall-post-audios {
	display: flex;
	flex-direction: column;
	gap: 8px;
	margin-bottom: 16px;
	width: 100%;
}

.wall-post-audio-item {
	width: 100%;
	background: var(--bg-tertiary, #0f0f0f);
	border-radius: 6px;
	overflow: hidden;
	border: 1px solid var(--border, #2a2a2a);
}

.wall-post-attachments.single .wall-post-attachment-photo {
	aspect-ratio: 16 / 9;
}

.wall-post-attachments.triple .wall-post-attachment:first-child {
	aspect-ratio: 1 / 2;
}

@media (max-width: 768px) {
	.wall-post {
		padding: 16px;
		margin-bottom: 12px;
		border-radius: 12px;
	}

	.wall-post-repost-header {
		margin-bottom: 10px;
		padding: 6px 10px;
	}

	.wall-post-repost-content {
		gap: 6px;
	}

	.wall-post-repost-icon {
		width: 12px;
		height: 12px;
	}

	.wall-post-repost-avatar {
		width: 18px;
		height: 18px;
	}

	.wall-post-repost-name {
		font-size: 12px;
	}

	.wall-post-header {
		margin-bottom: 12px;
		padding-bottom: 10px;
	}

	.wall-post-content {
		margin-bottom: 12px;
	}

	.wall-post-text {
		font-size: 14px;
	}

	.wall-post-attachments {
		gap: 4px;
		margin-bottom: 12px;

		&.single {
			max-width: 100%;
		}

		&.double {
			max-width: 100%;
		}

		&.triple {
			max-width: 100%;
		}

		&.quad {
			max-width: 100%;
		}

		&.multiple {
			max-width: 100%;
		}

		&.many {
			max-width: 100%;
		}
	}
}

@media (max-width: 480px) {
	.wall-post {
		padding: 12px;
		margin-bottom: 10px;
		border-radius: 10px;
	}

	.wall-post-repost-header {
		margin-bottom: 8px;
		padding: 5px 8px;
	}

	.wall-post-repost-content {
		gap: 5px;
	}

	.wall-post-repost-icon {
		width: 11px;
		height: 11px;
	}

	.wall-post-repost-avatar {
		width: 16px;
		height: 16px;
	}

	.wall-post-repost-name {
		font-size: 11px;
	}

	.wall-post-header {
		margin-bottom: 10px;
		padding-bottom: 8px;
	}

	.wall-post-time {
		font-size: 12px;
	}

	.wall-post-text {
		font-size: 13px;
	}

	.wall-post-attachments {
		gap: 3px;
		margin-bottom: 10px;
	}
}
</style>
