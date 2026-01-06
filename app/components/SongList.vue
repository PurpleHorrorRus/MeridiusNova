<template>
	<VirtualSongList
		v-if="virtualized"
		:items="songs"
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
			<slot
				name="item"
				:items="visibleItems"
				:start-index="startIndex"
				:handle-click="handleSongClick"
				:handle-album-click="handleAlbumClick"
				:handle-artist-click="handleArtistClick"
				:handle-action="handleSongAction"
				:handle-long-press="handleLongPress"
			>
				<LazySong
					v-for="(audio, relativeIndex) in visibleItems"
					:key="audio.full_id || `${audio.owner_id}-${audio.id}-${startIndex + relativeIndex}`"
					:audio="audio"
					:index="tableMode ? startIndex + relativeIndex : undefined"
					@click="handleSongClick(audio)"
					@album-click="handleAlbumClick"
					@artist-click="handleArtistClick"
					@action="handleSongAction"
					@long-press="handleLongPress(audio)"
				/>
			</slot>
		</template>
		<template #loadMore>
			<slot name="loadMore" />
		</template>
	</VirtualSongList>

	<div v-else class="song-list">
		<LazySong
			v-for="(audio, index) in songs"
			:key="audio.full_id || `${audio.owner_id}-${audio.id}-${index}`"
			v-memo="[audio.full_id, index, tableMode]"
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
</template>

<script setup lang="ts">
import { inject, defineAsyncComponent } from "vue";
import { storeToRefs } from "pinia";
import { usePlayerStore } from "~/stores/player";
import { usePlaylistStore } from "~/stores/playlist";
import { useModalStore } from "~/stores/modal";
import { useAudioStore } from "~/stores/audio";
import { navigateToSimilarTracks } from "~/utils/navigation";
import { useSongsContext } from "~/composables/useSongsContext";
import { useIsMobile } from "~/composables/useIsMobile";
const LazySong = defineAsyncComponent(() => import("~/components/Song/Song.vue"));
import VirtualSongList from "~/components/VirtualSongList.vue";
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
}>(), {
	virtualized: false,
	itemHeight: 56,
	overscan: 10,
	hasMore: false,
	isLoadingMore: false
});

const playerStore = usePlayerStore();
const playlistStore = usePlaylistStore();
const audioStore = useAudioStore();
const { song: playerSong, paused } = storeToRefs(playerStore);
const { current, playing, playingSongs } = storeToRefs(playlistStore);
const songsContext = useSongsContext();
const { isMobile } = useIsMobile();
const modalStore = useModalStore();

const virtualListRef = ref<InstanceType<typeof VirtualSongList> | null>(null);

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
	const currentSongs = playingSongs.value;
	const existingIndex = currentSongs.findIndex((s: TAudio) => s.full_id === audio.full_id);

	if (existingIndex >= 0) {
		playlistStore.setCurrentIndex(existingIndex);

		const songFromQueue = currentSongs[existingIndex];

		if (songFromQueue) {
			await playerStore.play({
				...songFromQueue,
				from: "queue",
				manual: true
			} as TAudio & { from?: string; manual?: boolean });
		}

		return;
	}

	let contextSongs: TAudio[] = [];
	let playlistToUse: TPlaylist | undefined = undefined;
	const currentPlaylist = current.value;
	const playingPlaylist = playing.value;

	if (songsContext?.value && songsContext.value.length > 0) {
		contextSongs = songsContext.value;

		if (currentPlaylist && currentPlaylist.raw_id.startsWith("search_")) {
			playlistToUse = { ...currentPlaylist, list: contextSongs };
		} else if (currentPlaylist) {
			const isUserLibrary = currentPlaylist.playlist_id === -1;
			if (!isUserLibrary || currentPlaylist.owner_id === audio.owner_id) {
				playlistToUse = { ...currentPlaylist, list: contextSongs };
			}
		}
	} else if (currentPlaylist?.list && currentPlaylist.list.length > 0) {
		contextSongs = currentPlaylist.list;
		playlistToUse = currentPlaylist;
	} else if (playingPlaylist?.list && playingPlaylist.list.length > 0) {
		contextSongs = playingPlaylist.list;
		playlistToUse = playingPlaylist;
	} else if (currentPlaylist && currentPlaylist.owner_id && currentPlaylist.playlist_id) {
		await playlistStore.playFromPlaylist(audio, currentPlaylist);
		return;
	} else if (playingPlaylist && playingPlaylist.owner_id && playingPlaylist.playlist_id) {
		await playlistStore.playFromPlaylist(audio, playingPlaylist);
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

	await playlistStore.playFromQueue(audio, contextSongs, playlistToUse || currentPlaylist || playingPlaylist || undefined);
};

const handleSongAction = async (action: string, data?: any) => {
	if (!data || typeof data !== "object" || !("full_id" in data)) {
		return;
	}

	const audio = data as TAudio;

	switch (action) {
		case "add":
			await playlistStore.addSongToLibrary(audio, {
				songsContext
			});
			break;
		case "delete":
			await playlistStore.deleteSong(audio, {
				songsContext
			});
			break;
		case "edit":
			modalStore.openModal("editTrack", { audio });
			break;
		case "lyrics":
			modalStore.openModal("lyrics", { audio });
			break;
		case "download":
			await audioStore.downloadAudio(audio).catch(console.error);
			break;
		case "share":
			modalStore.openModal("shareAudio", { audio });
			break;
		case "similar":
			const result = await audioStore.getSimilarTracks(audio).catch(() => null);
			if (result) {
				navigateToSimilarTracks(audio);
			}
			break;
		case "add-to-playlist":
			if (data.playlist) {
				await playlistStore.addSongToPlaylist(audio, data.playlist).catch(console.error);
			}
			break;
		case "remove-from-playlist":
			if (data.playlist) {
				const result = await playlistStore.removeSongFromPlaylist(audio, data.playlist).catch(console.error);

				if (result?.success) {
					playlistStore.removeSongByFullId(audio.full_id);

					const currentSong = playlistStore.currentSong;
					if (currentSong && currentSong.full_id === audio.full_id) {
						playlistStore.next();
					}

					if (data.playlist.size !== undefined) {
						data.playlist.size = Math.max(0, (data.playlist.size || 0) - 1);
					}
				}
			}
			break;
	}
};

const handleAlbumClick = (albumInfo: { owner_id: number; playlist_id: number; access_hash: string }) => {
	const route = `/playlist/${albumInfo.owner_id}/${albumInfo.playlist_id}`;
	const query = albumInfo.access_hash ? { access_hash: albumInfo.access_hash } : {};

	navigateTo({
		path: route,
		query
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
</style>

