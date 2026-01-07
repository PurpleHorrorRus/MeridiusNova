<template>
	<VirtualSongList
		v-if="virtualized"
		:items="props.sortable ? sortedSongs : props.songs"
		:item-height="itemHeight"
		:overscan="overscan"
		:has-more="hasMore"
		:is-loading-more="isLoadingMore"
		:load-more="loadMore"
		:scroll-container="scrollContainer"
		ref="virtualListRef"
		class="song-list song-list-virtualized"
	>
		<template #default="{ visibleItems, startIndex }">
			<div
				v-for="(audio, relativeIndex) in visibleItems"
				:key="audio.full_id || `${audio.owner_id}-${audio.id}-${startIndex + relativeIndex}`"
				class="song-wrapper"
				:class="{
					'dragging': sortable && dragAndDrop.draggedIndex.value === startIndex + relativeIndex,
					'drag-shift-up': sortable && shouldShiftUp(startIndex + relativeIndex),
					'drag-shift-down': sortable && shouldShiftDown(startIndex + relativeIndex),
					'current-song': isCurrentSong(startIndex + relativeIndex)
				}"
			>
				<div
					class="song-drag-handle"
					:class="{ 'draggable': sortable }"
					@mousedown.stop="sortable ? (e: MouseEvent) => dragAndDrop.handleMouseDown(e, startIndex + relativeIndex) : undefined"
				>
					<VirtualSongItem
						:index="startIndex + relativeIndex"
						@height="(height: number) => virtualListRef?.updateItemHeight(startIndex + relativeIndex, height)"
					>
						<slot
							name="item"
							:audio="audio"
							:index="startIndex + relativeIndex"
							:handle-click="handleSongClick"
							:handle-album-click="handleAlbumClick"
							:handle-artist-click="handleArtistClick"
							:handle-action="handleSongAction"
							:handle-long-press="handleLongPress"
							:handle-mouse-down="sortable ? (e: MouseEvent) => dragAndDrop.handleMouseDown(e, startIndex + relativeIndex) : undefined"
						>
							<LazySong
								:audio="audio"
								:index="tableMode ? startIndex + relativeIndex : undefined"
								@click="handleSongClick(audio)"
								@album-click="handleAlbumClick"
								@artist-click="handleArtistClick"
								@action="handleSongAction"
								@long-press="handleLongPress(audio)"
							/>
						</slot>
					</VirtualSongItem>
				</div>
			</div>
		</template>
		<template #loadMore>
			<slot name="loadMore" />
		</template>
	</VirtualSongList>

	<div v-else class="song-list">
		<div
			v-for="(audio, index) in props.sortable ? sortedSongs : props.songs"
			:key="audio.full_id || `${audio.owner_id}-${audio.id}-${index}`"
			class="song-wrapper"
			:class="{
				'dragging': sortable && dragAndDrop.draggedIndex.value === index,
				'drag-shift-up': sortable && shouldShiftUp(index),
				'drag-shift-down': sortable && shouldShiftDown(index),
				'current-song': isCurrentSong(index)
			}"
		>
		<div
			class="song-drag-handle"
			:class="{ 'draggable': sortable }"
			@mousedown.stop="sortable ? (e: MouseEvent) => dragAndDrop.handleMouseDown(e, index) : undefined"
		>
				<LazySong
					v-memo="[audio.full_id, index, tableMode, sortable]"
					hydrate-on-visible
					:audio="audio"
					:index="tableMode ? index : undefined"
					@click="handleSongClick(audio)"
					@album-click="handleAlbumClick"
					@artist-click="handleArtistClick"
					@action="handleSongAction"
					@long-press="handleLongPress(audio)"
				/>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { inject, defineAsyncComponent, watch } from "vue";
import { storeToRefs } from "pinia";
import { usePlayerStore } from "~/stores/player";
import { usePlaylistStore } from "~/stores/playlist";
import { useModalStore } from "~/stores/modal";
import { useAudioStore } from "~/stores/audio";
import { navigateToSimilarTracks } from "~/utils/navigation";
import { useSongsContext } from "~/composables/useSongsContext";
import { useIsMobile } from "~/composables/useIsMobile";
import { useDragAndDrop } from "~/composables/useDragAndDrop";
const LazySong = defineAsyncComponent(() => import("~/components/Song/Song.vue"));
import VirtualSongList from "~/components/VirtualSongList.vue";
import VirtualSongItem from "~/components/VirtualSongItem.vue";
import type { TAudio } from "~~/server/api/vk/audio/types";
import type { TPlaylist } from "~~/server/utils/types";

const props = withDefaults(defineProps<{
	songs: TAudio[];
	tableMode?: boolean;
	virtualized?: boolean;
	itemHeight?: number;
	overscan?: number;
	hasMore?: boolean;
	isLoadingMore?: boolean;
	loadMore?: () => Promise<void> | void;
	scrollContainer?: HTMLElement | null;
	sortable?: boolean;
}>(), {
	virtualized: false,
	itemHeight: 56,
	overscan: 10,
	hasMore: false,
	isLoadingMore: false,
	sortable: false
});

const emit = defineEmits<{
	sorted: [newOrder: TAudio[], originalOrder: TAudio[], fromIndex: number, toIndex: number];
}>();

const playerStore = usePlayerStore();
const playlistStore = usePlaylistStore();
const audioStore = useAudioStore();
const { song: playerSong, paused } = storeToRefs(playerStore);
const { current, playing, playingSongs, currentIndex } = storeToRefs(playlistStore);
const songsContext = useSongsContext();
const { isMobile } = useIsMobile();
const modalStore = useModalStore();

const virtualListRef = ref<InstanceType<typeof VirtualSongList> | null>(null);

const sortedSongs = ref<TAudio[]>([...props.songs]);

watch(() => props.songs, (newSongs) => {
	if (props.sortable) {
		if (newSongs.length !== sortedSongs.value.length) {
			sortedSongs.value = [...newSongs];
		} else {
			const currentFullIds = sortedSongs.value.map((songItem: TAudio) => songItem.full_id);
			const newFullIds = newSongs.map((songItem: TAudio) => songItem.full_id);
			const isSameOrder = currentFullIds.every((fullId: string, index: number) => fullId === newFullIds[index]);
			if (!isSameOrder) {
				sortedSongs.value = [...newSongs];
			}
		}
	}
}, { immediate: true });

const handleReorderSongs = async (newOrder: TAudio[], originalOrder?: TAudio[], fromIndex?: number, toIndex?: number) => {
	if (fromIndex === undefined || toIndex === undefined || fromIndex === toIndex) {
		return;
	}

	emit("sorted", newOrder, originalOrder || [...props.songs], fromIndex, toIndex);
};

const dragAndDrop = props.sortable ? useDragAndDrop(sortedSongs, handleReorderSongs) : {
	draggedIndex: ref<number | null>(null),
	draggedOverIndex: ref<number | null>(null),
	handleMouseDown: () => {}
};

const shouldShiftUp = (index: number): boolean => {
	if (!props.sortable || dragAndDrop.draggedIndex.value === null || dragAndDrop.draggedOverIndex.value === null || dragAndDrop.draggedIndex.value === dragAndDrop.draggedOverIndex.value) {
		return false;
	}

	return dragAndDrop.draggedIndex.value < dragAndDrop.draggedOverIndex.value && index > dragAndDrop.draggedIndex.value && index <= dragAndDrop.draggedOverIndex.value;
};

const shouldShiftDown = (index: number): boolean => {
	if (!props.sortable || dragAndDrop.draggedIndex.value === null || dragAndDrop.draggedOverIndex.value === null || dragAndDrop.draggedIndex.value === dragAndDrop.draggedOverIndex.value) {
		return false;
	}

	return dragAndDrop.draggedIndex.value > dragAndDrop.draggedOverIndex.value && index >= dragAndDrop.draggedOverIndex.value && index < dragAndDrop.draggedIndex.value;
};

const isCurrentSong = (index: number): boolean => {
	if (currentIndex.value < 0 || currentIndex.value >= playingSongs.value.length) {
		return false;
	}

	const currentSongs = props.sortable ? sortedSongs.value : props.songs;

	if (currentSongs.length !== playingSongs.value.length || index >= currentSongs.length) {
		return false;
	}

	return currentSongs[index]?.full_id === playingSongs.value[currentIndex.value]?.full_id && !!currentSongs[index]?.full_id;
};

const handleSongClick = async (audio: TAudio) => {
	const isCurrentSong = playerSong.value?.full_id === audio.full_id;
	const playerIsPlaying = !paused.value && playerSong.value !== null;

	if (isCurrentSong && playerIsPlaying) {
		playerStore.pause();
	} else if (isCurrentSong && !playerIsPlaying) {
		playerStore.resume();
	} else {
		const playlistInfo = inject<Ref<TPlaylist | null> | undefined>("playlistInfo", undefined);
		const pagePlaylist = playlistInfo?.value;

		const isUserLibrary = pagePlaylist && pagePlaylist.playlist_id === -1;
		const usePagePlaylist = pagePlaylist && (!isUserLibrary || pagePlaylist.owner_id === audio.owner_id);

		const currentPlaylist = usePagePlaylist ? pagePlaylist : current.value;
		const isCurrentVkMix = currentPlaylist && (currentPlaylist.playlist_id === -9 || String(currentPlaylist.owner_id) === "vkmix");

		if (currentPlaylist && !isCurrentVkMix && songsContext?.value && songsContext.value.length > 0) {
			await playlistStore.playFromPlaylist(audio, { ...currentPlaylist, list: songsContext.value });
		} else if (playing.value && playing.value.list && playing.value.list.length > 0) {
			const isPlayingVkMix = playing.value.playlist_id === -9 || String(playing.value.owner_id) === "vkmix";
			if (!isPlayingVkMix) {
				await playlistStore.playFromPlaylist(audio, playing.value);
			} else {
				await handlePlayFromContext(audio);
			}
		} else {
			await handlePlayFromContext(audio);
		}
	}
};

const handlePlayFromContext = async (audio: TAudio) => {
	const existingIndex = playingSongs.value.findIndex((audioItem: TAudio) => {
		return audioItem.full_id === audio.full_id;
	});

	if (existingIndex >= 0) {
		playlistStore.setCurrentIndex(existingIndex);

		if (existingIndex in playingSongs) {
			await playerStore.play({
				...playingSongs.value[existingIndex],
				from: "queue",
				manual: true
			} as TAudio & { from?: string; manual?: boolean });
		}

		return;
	}

	let contextSongs: TAudio[] = [];
	let playlistToUse: TPlaylist | undefined = undefined;

	if (songsContext?.value && songsContext.value.length > 0) {
		contextSongs = songsContext.value;

		if (current.value && current.value.raw_id.startsWith("search_")) {
			playlistToUse = { ...current.value, list: contextSongs };
		} else if (current.value) {
			if (current.value.playlist_id !== -1 || current.value.owner_id === audio.owner_id) {
				playlistToUse = { ...current.value, list: contextSongs };
			}
		}
	} else if (current.value?.list && current.value.list.length > 0) {
		contextSongs = current.value.list;
		playlistToUse = current.value;
	} else if (playing.value?.list && playing.value.list.length > 0) {
		contextSongs = playing.value.list;
		playlistToUse = playing.value;
	} else if (current.value && current.value.owner_id && current.value.playlist_id) {
		await playlistStore.playFromPlaylist(audio, current.value);
		return;
	} else if (playing.value && playing.value.owner_id && playing.value.playlist_id) {
		await playlistStore.playFromPlaylist(audio, playing.value);
		return;
	} else {
		const route = useRoute();
		const ownerId = route.params.owner_id ? Number(route.params.owner_id) : null;
		const playlistId = route.params.playlist_id ? Number(route.params.playlist_id) : null;

		if (ownerId !== null && playlistId !== null && playlistId !== -1) {
			await playlistStore.playFromPlaylist(audio, {
				owner_id: ownerId,
				playlist_id: playlistId,
				raw_id: `${ownerId}_${playlistId}`,
				title: "",
				cover_url: "",
				description: "",
				size: 0,
				listens: 0,
				last_updated: 0,
				explicit: false,
				followed: false,
				official: false,
				restricted: false,
				access_hash: route.query.access_hash as string || "",
				follow_hash: "",
				edit_hash: "",
				list: []
			});

			return;
		}

		contextSongs = [audio];
	}

	await playlistStore.playFromQueue(audio, contextSongs, playlistToUse || current.value || playing.value || undefined);
};

type TSongActionData = TAudio | (TAudio & { playlist?: TPlaylist });

const handleSongAction = async (action: string, data?: TSongActionData) => {
	if (!data || typeof data !== "object" || !("full_id" in data)) {
		return;
	}

	switch (action) {
		case "add": {
			await playlistStore.addSongToLibrary(data, {
				songsContext
			});

			break;
		}

		case "delete": {
			await playlistStore.deleteSong(data, {
				songsContext
			});

			break;
		}

		case "edit": {
			modalStore.openModal("editTrack", { audio: data });
			break;
		}

		case "lyrics": {
			modalStore.openModal("lyrics", { audio: data });
			break;
		}

		case "download": {
			await audioStore.downloadAudio(data).catch(console.error);
			break;
		}

		case "share": {
			modalStore.openModal("shareAudio", { audio: data });
			break;
		}

		case "similar": {
			if (await audioStore.getSimilarTracks(data).catch(() => null)) {
				navigateToSimilarTracks(data);
			}

			break;
		}

		case "add-to-playlist": {
			if ("playlist" in data && data.playlist) {
				await playlistStore.addSongToPlaylist(data, data.playlist).catch(console.error);
			}

			break;
		}

		case "remove-from-playlist": {
			if ("playlist" in data && data.playlist) {
				const result = await playlistStore.removeSongFromPlaylist(data, data.playlist).catch(console.error);

				if (result?.success) {
					playlistStore.removeSongByFullId(data.full_id);

					if (playlistStore.currentSong?.full_id === data.full_id) {
						playlistStore.next();
					}

					if (data.playlist.size !== undefined) {
						data.playlist.size = Math.max(0, (data.playlist.size || 0) - 1);
					}
				}
			}
			break;
		}
	}
};

const handleAlbumClick = (albumInfo: { owner_id: number; playlist_id: number; access_hash: string }) => {
	navigateTo({
		path: `/playlist/${albumInfo.owner_id}/${albumInfo.playlist_id}`,
		query:  albumInfo.access_hash ? { access_hash: albumInfo.access_hash } : {}
	});
};

const handleArtistClick = (artist: { id?: string; link?: string; name?: string }) => {
	const artistId = artist.id || artist.link;

	if (artistId) {
		navigateTo(`/artist/${artistId}`);
	}
};

const handleLongPress = (audio: TAudio) => {
	if (isMobile.value) {
		modalStore.openModal("songActions", { audio });
	}
};

defineExpose({
	updateItemHeight: (index: number, height: number) => {
		if (virtualListRef.value) {
			virtualListRef.value.updateItemHeight(index, height);
		}
	},
	scrollToIndex: (index: number) => {
		if (virtualListRef.value) {
			virtualListRef.value.scrollToIndex(index);
		}
	}
});
</script>

<style scoped lang="scss">
.song-list {
	display: flex;
	flex-direction: column;
	gap: 0;
}

.song-list-virtualized {
	width: 100%;
}

.song-wrapper {
	position: relative;
	transition: transform 0.2s ease;

	&.dragging {
		opacity: 0.5;
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
	cursor: default;
	-webkit-user-select: none;
	user-select: none;
	touch-action: none;

	&.draggable {
		cursor: move;
		-webkit-touch-callout: none;
		-webkit-user-select: none;
		user-select: none;
	}

	:deep(.song) {
		pointer-events: auto;
	}

	:deep(img) {
		-webkit-user-drag: none;
		user-select: none;
		pointer-events: none;
	}
}

:global(.drag-ghost) {
	background: var(--bg-secondary, #181818) !important;
	border-radius: 8px;
}
</style>