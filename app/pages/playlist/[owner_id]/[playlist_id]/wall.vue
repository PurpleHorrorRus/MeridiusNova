<template>
	<div class="wall-tab">
		<div v-if="firstLoad" class="wall-loading">
			<SkeletonFeedPost v-for="i in 3" :key="i" />
		</div>

		<div v-else-if="error && posts.length === 0" class="wall-error">
			{{ error }}
		</div>

		<div v-else class="wall-content">
			<div v-if="posts.length === 0" class="wall-empty">
				<p>Посты не найдены</p>
			</div>

			<div v-else class="wall-posts">
				<WallPost
					v-for="(post, index) in posts"
					:key="`wall-post-${post.post_id}-${index}`"
					:post="post"
				/>

				<div v-if="canLoadMore" class="wall-load-more" ref="loadMoreRef">
					<LoadingSpinner />
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from "vue";
import type { TAudio } from "~~/server/api/vk/audio/types";
import type { TPlaylist } from "~~/server/utils/types";
import { provideSongsContext } from "~/composables/useSongsContext";
import { useIntersectionObserver } from "~/composables/useIntersectionObserver";
import WallPost from "~/components/Wall/WallPost.vue";
import SkeletonFeedPost from "~/components/Skeleton/SkeletonFeedPost.vue";
import LoadingSpinner from "~/components/LoadingSpinner.vue";

interface WallPostItem {
	id: number;
	owner_id: number;
	date: number;
	text: string;
	is_pinned?: number;
	likes?: {
		count: number;
		user_likes?: number;
	};
	reposts?: {
		count: number;
	};
	attachments?: Array<{
		type: string;
		audio?: {
			id: number;
			owner_id: number;
			artist?: string;
			title?: string;
			duration?: number;
			url?: string;
			[key: string]: any;
		};
		audio_playlist?: {
			id: number;
			owner_id: number;
			access_key?: string;
		};
		photo?: WallPhoto;
	}>;
	copy_history?: Array<{
		id: number;
		owner_id: number;
		date: number;
		text: string;
		attachments?: Array<{
			type: string;
			audio?: any;
			audio_playlist?: {
				id: number;
				owner_id: number;
				access_key?: string;
			};
		}>;
	}>;
}

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

interface ProcessedWallPost {
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

const route = useRoute();
const ownerId = computed(() => Number(route.params.owner_id));

const firstLoad = ref(true);
const posts = ref<ProcessedWallPost[]>([]);
const allSongs = ref<TAudio[]>([]);
const count = ref(0);
const loaded = ref(0);
const isLoading = ref(false);
const error = ref<string | null>(null);

const canLoadMore = computed(() => {
	return loaded.value < count.value && !isLoading.value;
});

const canProcess = (attachment: { type: string }) => {
	return attachment.type === "audio" || attachment.type === "audio_playlist";
};

const processingPosts = (data: { items: WallPostItem[]; count: number }) => {
	const items = [...data.items];
	const repostedFromMap = new Map<number, { owner_id: number; post_id: number }>();

	console.log(`[Wall] Received ${items.length} posts from API`);

	for (let i = 0; i < items.length; i++) {
		if (items[i].copy_history && items[i].copy_history.length > 0) {
			const originalPost = items[i];
			const repostedPost = items[i].copy_history[0];
			const likes = items[i].likes;
			
			items[i] = {
				...repostedPost,
				likes,
				owner_id: originalPost.owner_id,
				id: originalPost.id,
				date: originalPost.date,
				is_pinned: originalPost.is_pinned
			};
			
			repostedFromMap.set(originalPost.id, {
				owner_id: repostedPost.owner_id,
				post_id: repostedPost.id
			});
		}
	}

	if (count.value === 0) {
		count.value = data.count;
	}

	const filtered = items.filter(post => {
		const hasAudio = post.attachments?.some(attachmentItem => canProcess(attachmentItem));
		if (!hasAudio) {
			console.log(`[Wall] Post ${post.id} skipped - no audio attachments`);
		}
		return hasAudio;
	});

	console.log(`[Wall] Filtered to ${filtered.length} posts with audio attachments`);
	loaded.value += items.length;

	return { posts: filtered, repostedFromMap };
};

const processingPost = async (post: WallPostItem, repostedFrom?: { owner_id: number; post_id: number }): Promise<ProcessedWallPost[]> => {
	const onlyAudiosAttachments = post.attachments?.filter(attachmentItem => canProcess(attachmentItem)) || [];

	if (onlyAudiosAttachments.length === 0) {
		return [];
	}

	const photos: WallPhoto[] = [];
	
	for (const attachment of post.attachments || []) {
		if (attachment.type === "photo" && attachment.photo) {
			photos.push(attachment.photo);
		}
	}

	const meta = {
		owner_id: post.owner_id,
		likes: post.likes,
		text: post.text || "",
		isPinned: Boolean(post.is_pinned),
		time: post.date || 0,
		photos: photos.length > 0 ? photos : undefined,
		repostedFrom
	};

	const results: ProcessedWallPost[] = [];
	
	const audioAttachments = onlyAudiosAttachments.filter(attachmentItem => attachmentItem.type === "audio");
	const playlistAttachments = onlyAudiosAttachments.filter(attachmentItem => attachmentItem.type === "audio_playlist");

	if (audioAttachments.length > 0) {
		const allAudioIds: string[] = [];
		
		for (const attachment of audioAttachments) {
			if (attachment.audio && attachment.audio.owner_id && attachment.audio.id) {
				allAudioIds.push(`${attachment.audio.owner_id}_${attachment.audio.id}`);
			}
		}
		
		if (allAudioIds.length > 0) {
			console.log(`[Wall] Found ${allAudioIds.length} audio(s) in post ${post.id}, reloading:`, allAudioIds);
			
			const reloadResponse = await $fetch<TAudio[]>("/api/vk/audio/reload", {
				method: "POST",
				body: {
					audio_ids: allAudioIds.join(",")
				}
			}).catch((err) => {
				console.error(`[Wall] Failed to reload audio for post ${post.id}:`, err);
				return [];
			});
			
			if (reloadResponse && Array.isArray(reloadResponse) && reloadResponse.length > 0) {
				results.push({
					...meta,
					post_id: post.id,
					type: "audio",
					audios: reloadResponse
				});
				console.log(`[Wall] Successfully reloaded ${reloadResponse.length} audio(s) for post ${post.id}`);
			} else {
				console.warn(`[Wall] Reload returned empty, trying getFromWall for post ${post.id}`);
				
				const audios = (await $fetch<{ audios: TAudio[] }>("/api/vk/wall/audio", {
					params: {
						owner_id: post.owner_id,
						post_id: post.id
					}
				}).catch((err) => {
					console.error(`[Wall] Failed to load audio from post ${post.id}:`, err);
					return { audios: [] };
				})).audios;

				if (audios && audios.length > 0) {
					results.push({
						...meta,
						post_id: post.id,
						type: "audio",
						audios
					});
					console.log(`[Wall] Successfully loaded ${audios.length} audio(s) via getFromWall for post ${post.id}`);
				} else {
					console.warn(`[Wall] No audios found in post ${post.id} after all attempts`);
				}
			}
		} else {
			console.warn(`[Wall] No valid audio IDs found in attachments for post ${post.id}`);
		}
	}

	for (const attachment of playlistAttachments) {
		if (attachment.type === "audio_playlist" && attachment.audio_playlist) {
			const playlist = await $fetch<TPlaylist>(`/api/vk/playlists/${attachment.audio_playlist.owner_id}/${attachment.audio_playlist.id}`, {
				params: {
					access_hash: attachment.audio_playlist.access_key,
					count: 10,
					list: "true"
				}
			}).catch((err) => {
				console.error(`Error processing attachment in post ${post.id}:`, err);
				return null;
			});

			if (playlist && playlist.list && playlist.list.length > 0) {
				results.push({
					...meta,
					post_id: post.id,
					type: "audio_playlist",
					playlist: {
						...playlist,
						list: playlist.list
					}
				});
			} else {
				console.warn(`No tracks found in playlist from post ${post.id}`);
			}
		}
	}

	return results;
};

const getAudiosPosts = async (params: { offset?: number; count?: number } = {}) => {
	const data = await $fetch<{
		count: number;
		items: WallPostItem[];
	}>("/api/vk/wall/get", {
		params: {
			owner_id: ownerId.value,
			offset: params.offset || 0,
			count: params.count || 30
		}
	});

	return processingPosts(data);
};

const get = async (params: { offset?: number; count?: number } = {}) => {
	const { posts: audioPosts, repostedFromMap } = await getAudiosPosts(params);

	console.log(`[Wall] Found ${audioPosts.length} posts with audio attachments`);

	if (audioPosts.length > 0) {
		const results: ProcessedWallPost[] = [];
		
		const processPromises = audioPosts.map(async (post) => {
			const repostedFrom = repostedFromMap.get(post.id);
			const processed = await processingPost(post, repostedFrom).catch((err) => {
				console.error(`[Wall] Failed to process post ${post.id}:`, err, post);
				return [];
			});
			console.log(`[Wall] Processed post ${post.id}: ${processed.length} results`);
			return processed;
		});

		const processedResults = await Promise.all(processPromises);
		
		for (const processed of processedResults) {
			if (processed && processed.length > 0) {
				results.push(...processed);
			}
		}

		console.log(`[Wall] Total processed posts: ${results.length}`);
		return results;
	}

	return [];
};

const filterPost = (post: ProcessedWallPost) => {
	return (post.audios && post.audios.length > 0) || (post.playlist?.list && post.playlist.list.length > 0);
};

const mapPost = (post: ProcessedWallPost): TAudio[] => {
	return post.audios || post.playlist?.list || [];
};

const setPosts = (result: ProcessedWallPost[]) => {
	const filtered = result.filter(filterPost);
	posts.value = filtered;
	allSongs.value = filtered.map(mapPost).flat();
};

const loadMore = async () => {
	if (isLoading.value || !canLoadMore.value) {
		return;
	}

	isLoading.value = true;

	const result = await get({ offset: loaded.value }).catch((err) => {
		console.error("Failed to load more posts:", err);
		error.value = "Ошибка загрузки постов";
		return [];
	});
	
	const more = result.filter(filterPost);
	
	if (more.length > 0) {
		posts.value = posts.value.concat(more);
		const songs = more.map(mapPost).flat();
		allSongs.value = allSongs.value.concat(songs);
	}

	isLoading.value = false;
};

provideSongsContext(allSongs);

const loadMoreRef = ref<HTMLElement | null>(null);

useIntersectionObserver(
	loadMoreRef,
	async (entries) => {
		if (entries[0]?.isIntersecting && canLoadMore.value) {
			await loadMore();
		}
	},
	{
		threshold: 0.1,
		rootMargin: "200px",
		enabled: computed(() => canLoadMore.value && !isLoading.value)
	}
);

onMounted(async () => {
	firstLoad.value = true;
	error.value = null;

	const result = await get().catch((err: Error) => {
		console.error("Failed to load posts:", err);
		error.value = err.message || "Ошибка загрузки постов";
		return [];
	});

	if (result.length > 0) {
		setPosts(result);

		while (posts.value.length < 10 && canLoadMore.value && !isLoading.value) {
			await loadMore();
		}
	} else if (count.value > 0) {
		while (posts.value.length < 10 && canLoadMore.value && !isLoading.value) {
			await loadMore();
		}
	}

	firstLoad.value = false;
});
</script>

<style scoped lang="scss">
.wall-tab {
	display: flex;
	flex-direction: column;
	min-height: 100%;
}

.wall-loading {
	display: flex;
	flex-direction: column;
	gap: 10px;
	padding: 10px 32px;

	@media (max-width: 768px) {
		padding: 10px 16px;
	}

	@media (max-width: 480px) {
		padding: 10px 12px;
	}
}

.wall-error {
	text-align: center;
	padding: 40px 32px;
	color: var(--text-secondary, #b3b3b3);

	@media (max-width: 768px) {
		padding: 30px 20px;
	}

	@media (max-width: 480px) {
		padding: 20px 16px;
	}
}

.wall-content {
	display: flex;
	flex-direction: column;
}

.wall-posts {
	display: flex;
	flex-direction: column;
	margin-top: 10px;
	padding: 0 32px;

	@media (max-width: 768px) {
		padding: 0 16px;
	}

	@media (max-width: 480px) {
		padding: 0 12px;
	}
}

.wall-empty {
	text-align: center;
	padding: 40px 32px;
	color: var(--text-secondary, #b3b3b3);

	@media (max-width: 768px) {
		padding: 30px 20px;
	}

	@media (max-width: 480px) {
		padding: 20px 16px;
		font-size: 14px;
	}
}

.wall-load-more {
	text-align: center;
	padding: 20px 32px;
	min-height: 60px;
	display: flex;
	align-items: center;
	justify-content: center;

	@media (max-width: 768px) {
		padding: 16px;
	}

	@media (max-width: 480px) {
		padding: 12px;
	}
}
</style>
