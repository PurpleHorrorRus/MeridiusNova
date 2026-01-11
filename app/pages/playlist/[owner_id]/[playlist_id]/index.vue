<template>
	<div class="playlist-page">
		<div v-if="pending && !data && !error" class="loading">
			<LoadingSpinner />
		</div>

		<div v-else-if="error && !data" class="error" v-text="error" />

		<div v-else class="playlist-content" ref="contentRef">
			<div class="playlist-tracks">
				<div v-if="isRestricted" class="playlist-restricted-message">
					<Icon name="mdi:lock" size="20" />
					<span v-text="getString('library.hidden')" />
				</div>

				<template v-else>
					<div class="playlist-tracks-header">
						<span class="tracks-header-title" v-text="getString('playlist.tracksHeader.title')" />
						<span class="tracks-header-album" v-text="getString('playlist.tracksHeader.album')" />
						<span class="tracks-header-duration">
							<Icon name="mdi:clock-outline" size="16" />
						</span>
					</div>

					<SongList
						:songs="audios"
						:table-mode="true"
						:virtualized="true"
						:item-height="56"
						:overscan="14"
						:has-more="hasMore"
						:is-loading-more="isLoadingMore"
						:load-more="loadMore"
						:sortable="canEdit"
						@sorted="handleReorderSongs"
						ref="virtualListRef"
						class="playlist-virtual-list"
					/>
				</template>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import SongList from "~/components/SongList.vue";

import { usePlaylistStore } from "~/stores/playlist";
import { useVkStore } from "~/stores/vk";
import { useAudioStore } from "~/stores/audio";

import { provideSongsContext } from "~/composables/useSongsContext";
import { authenticatedFetch } from "~/utils/api";

import type { TParsedPayload } from "~~/server/api/vk/audio/types";
import { type TPlaylist, type TMore, type TAudio } from "~~/server/utils/types";

const { getString } = useStrings();
const route = useRoute();
const vkStore = useVkStore();
const ownerId = computed(() => Number(route.params.owner_id));
const playlistId = computed(() => Number(route.params.playlist_id));
const accessHash = computed(() => route.query.access_hash as string | undefined);
const isCollection = computed(() => playlistId.value === -1);
const playlistStore = usePlaylistStore();

// Получаем данные плейлиста из родительского компонента
const playlistData = inject<Ref<TPlaylist | null>>("playlistInfo", ref(null));

const canEdit = computed(() => {
	return !!(playlistData.value &&
		playlistData.value.owner_id === vkStore.user_id);
});

const isRestricted = computed(() => {
	if (playlistId.value !== -1) {
		return false;
	}
	
	if (pending.value) {
		return false;
	}
	
	if (audios.value && audios.value.length > 0) {
		return false;
	}
	
	const playlist = playlistData.value;

	if (!playlist) {
		return false;
	}

	if (error.value && !data.value) {
		return true;
	}
	
	return playlist.restricted === true;
});

const audioUrl = computed(() => {
	if (isCollection.value) {
		return `/api/vk/audio/${ownerId.value}/${playlistId.value}`;
	}
	return "";
});

const audioKey = computed(() => `audio-${ownerId.value}-${playlistId.value}`);
const { data, pending, error, refresh } = useAsyncData<TParsedPayload>(
	audioKey,
	() => authenticatedFetch<TParsedPayload>(audioUrl.value),
	{
		immediate: false,
		lazy: true,
		getCachedData: (key) => {
			const cached = useNuxtApp().payload.data[key];
			if (cached && Date.now() - (cached._timestamp || 0) < 30000) {
				return cached;
			}
			return undefined;
		},
		transform: (data) => {
			if (data) {
				(data as any)._timestamp = Date.now();
			}
			return data;
		}
	}
);

watch([audioUrl, isCollection], ([url, isCollectionValue]) => {
	if (url && isCollectionValue) {
		refresh();
	}
}, { immediate: true });


const audios = ref<TAudio[]>([]);

watch([playlistData, data, isCollection], () => {
	if (!isCollection.value && playlistData.value?.list && Array.isArray(playlistData.value.list)) {
		const list = playlistData.value.list;
		if (audios.value.length !== list.length || 
			audios.value.length === 0 || 
			audios.value[0]?.full_id !== list[0]?.full_id ||
			audios.value[audios.value.length - 1]?.full_id !== list[list.length - 1]?.full_id) {
			audios.value = [...list];
		}
		return;
	}

	if (isCollection.value && data.value) {
		const audiosList = (data.value as unknown as TParsedPayload)?.audios;
		if (audiosList) {
			if (audios.value.length !== audiosList.length || 
				audios.value.length === 0 || 
				audios.value[0]?.full_id !== audiosList[0]?.full_id ||
				audios.value[audios.value.length - 1]?.full_id !== audiosList[audiosList.length - 1]?.full_id) {
				audios.value = [...audiosList];
			}
			return;
		}
	}

	if (audios.value.length > 0) {
		audios.value = [];
	}
}, { immediate: true, flush: "post", deep: true });

watch([data, pending, error, isCollection], ([newData, isPending, hasError, isCollectionValue]) => {
	if (!isCollectionValue || !playlistData.value) {
		return;
	}

	if (!isPending) {
		if (hasError) {
			playlistData.value.restricted = true;
		} else {
			const payload = newData as unknown as TParsedPayload;
			playlistData.value.restricted = !payload || !payload.audios || payload.audios.length === 0;
		}
	}
}, { immediate: true });

provideSongsContext(audios);

provide("playlistAudiosComputed", audios);
provide("playlistData", data);

const hasMore = computed(() => {
	if (!isCollection.value) {
		return false;
	}

	if (data.value) {
		const payload = data.value as unknown as TParsedPayload;
		if (payload?.more) {
			return Boolean(payload.more.section_id && payload.more.next_from);
		}
	}

	return false;
});

const isLoadingMore = ref(false);

const loadMore = async () => {
	if (!hasMore.value || pending.value || isLoadingMore.value) {
		return;
	}

	isLoadingMore.value = true;

	if (isCollection.value) {
		if (!data.value) {
			isLoadingMore.value = false;
			return;
		}

		const payload = data.value as unknown as TParsedPayload;
		const more = payload?.more;

		if (!more?.section_id || !more?.next_from) {
			isLoadingMore.value = false;
			return;
		}

		const result = await authenticatedFetch<TParsedPayload>(`/api/vk/audio/${ownerId.value}/${playlistId.value}`, {
			params: {
				section_id: more.section_id,
				next_from: more.next_from
			}
		}).catch(() => (null));

		if (result && data.value) {
			const payloadResult = data.value as unknown as TParsedPayload;
			
			data.value = {
				...payloadResult,
				audios: result.audios && result.audios.length > 0 
					? [...(payloadResult.audios || []), ...result.audios]
					: payloadResult.audios || [],
				more: result.more || {
					section_id: "",
					next_from: "",
					start_from: ""
				}
			} as TParsedPayload;
		}
	} else {
		if (!playlistData.value) {
			isLoadingMore.value = false;
			return;
		}

		const currentOffset = playlistData.value.list?.length || 0;

		const playlistResult = await authenticatedFetch<TPlaylist>(`/api/vk/playlists/${ownerId.value}/${playlistId.value}`, {
			params: {
				list: "true",
				access_hash: playlistData.value.access_hash || accessHash.value,
				count: "50",
				offset: String(currentOffset)
			}
		}).catch(() => (null));

		if (playlistResult && playlistResult.list && playlistResult.list.length > 0) {
			const currentList = playlistData.value.list || [];
			playlistData.value.list = [...currentList, ...playlistResult.list];

			if (playlistResult.size !== undefined) {
				playlistData.value.size = playlistResult.size;
			}

			if (playlistResult.more) {
				playlistData.value.more = playlistResult.more;
			} else {
				playlistData.value.more = {
					section_id: "",
					next_from: "",
					start_from: ""
				};
			}
		} else {
			if (playlistData.value) {
				playlistData.value.more = {
					section_id: "",
					next_from: "",
					start_from: ""
				};
			}
		}
	}

	isLoadingMore.value = false;
};

const handleReorderSongs = async (newOrder: TAudio[], originalOrder?: TAudio[], fromIndex?: number, toIndex?: number) => {
	if (!canEdit.value) {
		return;
	}

	if (isCollection.value) {
		const original = originalOrder || [...audios.value];
		
		if (fromIndex !== undefined && toIndex !== undefined && fromIndex !== toIndex) {
			const movedAudio = original[fromIndex];
			if (!movedAudio) {
				return;
			}

			let nextAudioId = 0;
			if (toIndex === 0) {
				nextAudioId = 0;
			} else if (toIndex > 0) {
				let targetIndexInOriginal: number;
				if (fromIndex > toIndex) {
					targetIndexInOriginal = toIndex - 1;
				} else {
					targetIndexInOriginal = toIndex;
				}
				
				const targetAudio = original[targetIndexInOriginal];
				if (targetAudio && targetAudio.id !== movedAudio.id) {
					nextAudioId = targetAudio.id;
				} else if (targetIndexInOriginal > 0) {
					const prevAudio = original[targetIndexInOriginal - 1];
					if (prevAudio && prevAudio.id !== movedAudio.id) {
						nextAudioId = prevAudio.id;
					}
				}
			}

			try {
				const audioStore = useAudioStore();
				await audioStore.reorderAudio({
					audio_id: movedAudio.id,
					next_audio_id: nextAudioId,
					owner_id: ownerId.value
				});
			} catch (error) {
				audios.value = original;
			}
		} else {
			let hasError = false;

			const movedItems: Array<{ audio: TAudio; newIndex: number; originalIndex: number }> = [];
			
			for (let i = 0; i < newOrder.length; i++) {
				const currentAudio = newOrder[i];
				if (!currentAudio) {
					continue;
				}

				const originalIndex = original.findIndex(a => a.full_id === currentAudio.full_id);
				
				if (originalIndex === i) {
					continue;
				}

				movedItems.push({ audio: currentAudio, newIndex: i, originalIndex });
			}

			if (movedItems.length === 0) {
				return;
			}

			movedItems.sort((a, b) => b.newIndex - a.newIndex);

			for (const moved of movedItems) {
				const nextAudio = moved.newIndex < newOrder.length - 1 ? newOrder[moved.newIndex + 1] : null;
				const nextAudioId = nextAudio ? nextAudio.id : 0;

				try {
					const audioStoreReorder = useAudioStore();
					await audioStoreReorder.reorderAudio({
						audio_id: moved.audio.id,
						next_audio_id: nextAudioId,
						owner_id: ownerId.value
					});
				} catch (error) {
					hasError = true;
					break;
				}
			}

			if (hasError) {
				audios.value = original;
			}
		}
	} else {
		if (!playlistData.value) {
			return;
		}

		const audioIdsParts: string[] = [];
		for (let i = 0; i < newOrder.length; i++) {
			const audioItem = newOrder[i];
			if (audioItem) {
				audioIdsParts.push(`${audioItem.full_id}_`);
			}
		}
		const audioIds = audioIdsParts.join(",");

		await playlistStore.reorderSongsInPlaylist({
			playlist_id: playlistData.value.playlist_id,
			Audios: audioIds
		}).catch(() => {
			if (playlistData.value && playlistData.value.list) {
				audios.value = [...playlistData.value.list];
			}
		});
	}
};
</script>

<style scoped lang="scss">
.playlist-page {
	display: flex;
	flex-direction: column;
	min-height: 100%;
}

.playlist-content {
	display: flex;
	flex-direction: column;
}

.playlist-tracks {
	display: flex;
	flex-direction: column;
	padding: 0 32px 32px;
	flex: 1;
	min-height: 0;

	@media (max-width: 768px) {
		padding: 0 16px 16px;
	}

	@media (max-width: 480px) {
		padding: 0 12px 12px;
	}
}

.playlist-virtual-list {
	flex: 1;
	min-height: 0;
}

.playlist-tracks-header {
	display: grid;
	grid-template-columns: 1fr 1fr 80px;
	gap: 16px;
	padding: 8px 16px;
	color: var(--text-secondary, #b3b3b3);
	font-size: 12px;
	font-weight: 500;
	text-transform: uppercase;
	letter-spacing: 1px;
	position: sticky;
	top: 0;
	background: var(--bg-primary, #121212);
	z-index: 10;
	align-items: center;

	@media (max-width: 768px) {
		gap: 12px;
		padding: 8px 12px;
		font-size: 11px;
	}

	@media (max-width: 480px) {
		grid-template-columns: 1fr 60px;
		gap: 8px;
		padding: 8px;
		font-size: 10px;

		.tracks-header-album {
			display: none;
		}
	}
}

.tracks-header-title {
	grid-column: 1;
}

.tracks-header-album {
	grid-column: 2;
}

.tracks-header-duration {
	grid-column: 3;
	text-align: center;
	display: flex;
	align-items: center;
	justify-content: center;

	@media (max-width: 480px) {
		grid-column: 2;
	}
}

.loading {
	padding: 32px;

	@media (max-width: 768px) {
		padding: 16px;
	}

	@media (max-width: 480px) {
		padding: 12px;
	}
}

.error {
	text-align: center;
	padding: 40px;

	@media (max-width: 768px) {
		padding: 20px;
	}

	@media (max-width: 480px) {
		padding: 16px;
	}
}

.load-more {
	text-align: center;
	padding: 20px;
	color: var(--text-secondary, #b3b3b3);
}

.song-wrapper {
	position: relative;
	transition: opacity 0.2s ease, transform 0.2s ease;
	-webkit-user-select: none;
	user-select: none;

	&.dragging {
		visibility: hidden;
	}

	&.drag-shift-up {
		transform: translateY(-56px);
	}

	&.drag-shift-down {
		transform: translateY(56px);
	}
}

.song-drag-handle {
	width: 100%;
	cursor: move;
	-webkit-user-select: none;
	user-select: none;
	touch-action: none;

	&.draggable {
		cursor: move;
		-webkit-touch-callout: none;
		-webkit-user-select: none;
		user-select: none;
	}

	.song {
		pointer-events: auto;
	}
}

:global(.drag-ghost) {
	background: var(--bg-secondary, #181818) !important;
	border-radius: 8px;
}

.playlist-restricted-message {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: center;
	gap: 8px;
	padding: 60px 32px;
	text-align: center;

	:deep(svg) {
		width: 20px;
		height: 20px;
		color: var(--text-secondary, #b3b3b3);
		opacity: 0.5;
	}

	span {
		font-size: 16px;
		font-weight: 400;
		color: var(--text-secondary, #b3b3b3);
		opacity: 0.7;
		line-height: 1.5;
	}

	@media (max-width: 768px) {
		padding: 48px 24px;
		gap: 8px;

		:deep(svg) {
			width: 18px;
			height: 18px;
		}

		span {
			font-size: 15px;
		}
	}

	@media (max-width: 480px) {
		padding: 40px 20px;
		gap: 6px;

		:deep(svg) {
			width: 16px;
			height: 16px;
		}

		span {
			font-size: 14px;
		}
	}
}


</style>
