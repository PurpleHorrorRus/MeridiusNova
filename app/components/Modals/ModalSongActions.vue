<template>
	<div class="song-actions-modal">
		<div class="modal-header">
			<h2 class="modal-title">Действия</h2>
			<button class="modal-close" @click="close">
				<Icon name="mdi:close" size="24" />
			</button>
		</div>

		<div class="modal-content">
			<div class="song-info-section">
				<div class="song-cover">
					<Cover
						:src="audio.cover || audio.coverUrl_p || audio.coverUrl_s"
						:width="80"
						:height="80"
					/>
				</div>
				<div class="song-details">
					<div class="song-title" v-html="audio.title" />
					<div class="song-artist" v-html="audio.performer || audio.artist" />
				</div>
			</div>

			<div class="actions-list">
				<div v-if="songProps.canAddPlaylist && showPlaylistList" class="playlist-section">
					<div class="playlist-section-header">
						<span class="playlist-section-title">Добавить в плейлист</span>
						<button class="playlist-section-close" @click="showPlaylistList = false">
							<Icon name="mdi:close" size="20" />
						</button>
					</div>
					<div class="playlist-list">
						<button
							v-for="playlist in myPlaylists"
							:key="playlist.raw_id"
							class="playlist-item"
							@click="handleSelectPlaylist(playlist)"
						>
							<div class="playlist-item-cover">
								<Cover
									:src="playlist.cover_url"
									:width="32"
									:height="32"
								/>
							</div>
							<span class="playlist-item-title" v-text="playlist.title" />
						</button>
						<div v-if="myPlaylists.length === 0" class="no-playlists">
							Нет плейлистов
						</div>
					</div>
				</div>

				<button
					v-if="songProps.canAddPlaylist && !showPlaylistList"
					class="action-item"
					@click="handleAddToPlaylist"
				>
					<Icon name="mdi:playlist-plus" size="24" />
					<span>Добавить в плейлист</span>
				</button>

				<button
					v-if="songProps.canAdd"
					class="action-item"
					@click="handleAdd"
				>
					<Icon name="mdi:heart-outline" size="24" />
					<span>Добавить в библиотеку</span>
				</button>

				<button
					v-if="songProps.canDelete && deleteLabel !== 'Удалить из плейлиста'"
					class="action-item"
					@click="handleDelete"
				>
					<Icon name="mdi:heart" size="24" />
					<span v-text="deleteLabel" />
				</button>

				<button
					v-if="songProps.canDelete && currentPlaylist && currentPlaylist.playlist_id !== -1"
					class="action-item"
					@click="handleRemoveFromPlaylist"
				>
					<Icon name="mdi:playlist-remove" size="24" />
					<span>Удалить из плейлиста</span>
				</button>

				<button
					v-if="songProps.canEdit"
					class="action-item"
					@click="handleEdit"
				>
					<Icon name="mdi:pencil" size="24" />
					<span>Редактировать</span>
				</button>

				<button
					v-if="songProps.hasLyrics"
					class="action-item"
					@click="handleLyrics"
				>
					<Icon name="mdi:text" size="24" />
					<span>Текст песни</span>
				</button>

				<button
					v-if="songProps.canDownload && isTauri"
					class="action-item"
					@click="handleDownload"
				>
					<Icon name="mdi:download" size="24" />
					<span>Скачать</span>
				</button>

				<button
					v-if="songProps.canShare"
					class="action-item"
					@click="handleShare"
				>
					<Icon name="mdi:share" size="24" />
					<span>Поделиться</span>
				</button>

				<button
					class="action-item"
					@click="handleSimilar"
				>
					<Icon name="mdi:music-note" size="24" />
					<span>Найти похожее</span>
				</button>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { storeToRefs } from "pinia";

import Cover from "~/components/Cover.vue";

import { useModalStore } from "~/stores/modal";
import { useVkStore } from "~/stores/vk";
import { usePlaylistStore } from "~/stores/playlist";
import { useAudioStore } from "~/stores/audio";

import { useIsTauri } from "~/composables/useIsTauri";
import { navigateToSimilarTracks } from "~/utils/navigation";

import type { TAudio } from "~~/server/api/vk/audio/types";

const props = defineProps<{
	audio: TAudio;
}>();

const playlistStore = usePlaylistStore();
const { current, playing } = storeToRefs(playlistStore);
const modalStore = useModalStore();
const vkStore = useVkStore();
const audioStore = useAudioStore();
const { isTauri } = useIsTauri();

const playlists = ref<TPlaylist[]>([]);
const showPlaylistList = ref(false);

const songProps = computed(() => {
	if (!props.audio) {
		return {
			canAdd: false,
			canDelete: false,
			canAddPlaylist: false,
			canEdit: false,
			canShare: false,
			hasLyrics: false,
			canDownload: false
		};
	}

	return {
		canAdd: Boolean(props.audio.canAdd),
		canDelete: Boolean(props.audio.canDelete),
		canAddPlaylist: Boolean(props.audio.canAddPlaylist),
		canEdit: Boolean(props.audio.canEdit),
		canShare: Boolean(props.audio.canShare),
		hasLyrics: Boolean(props.audio.hasLyrics),
		canDownload: !props.audio.is_restriction
	};
});

const currentPlaylist = computed(() => {
	return playing.value || current.value;
});

const deleteLabel = computed(() => {
	if (!props.audio) {
		return "Удалить из библиотеки";
	}

	return playlistStore.getDeleteTitle(props.audio);
});

const myPlaylists = computed(() => {
	return playlists.value.filter(playlist => {
		return playlist.owner_id === vkStore.user_id
			&& playlist.playlist_id !== -1
			&& playlist.raw_id !== currentPlaylist.value?.raw_id;
	});
});

const close = () => {
	modalStore.close();
};

const handleAdd = async () => {
	if (!props.audio) {
		return;
	}

	await playlistStore.addSongToLibrary(props.audio);
	close();
};

const handleDelete = async () => {
	if (!props.audio) {
		return;
	}

	await playlistStore.deleteSong(props.audio);
	close();
};

const handleEdit = () => {
	if (!props.audio) {
		return;
	}

	modalStore.openModal("editTrack", { audio: props.audio });
	close();
};

const handleLyrics = () => {
	if (!props.audio) {
		return;
	}

	modalStore.openModal("lyrics", { audio: props.audio });
	close();
};

const handleDownload = async () => {
	if (!props.audio) {
		return;
	}

	await audioStore.downloadAudio(props.audio).catch(console.error);
	close();
};

const handleShare = () => {
	if (!props.audio) {
		return;
	}

	modalStore.openModal("shareAudio", { audio: props.audio });
	close();
};

const handleSimilar = async () => {
	if (!props.audio) {
		return;
	}

	const result = await audioStore.getSimilarTracks(props.audio).catch(() => null);
	if (result) {
		navigateToSimilarTracks(props.audio);
		close();
	}
};

const handleAddToPlaylist = async () => {
	if (!props.audio) {
		return;
	}

	if (myPlaylists.value.length === 0) {
		const data = await $fetch<{ playlists: TPlaylist[] }>("/api/vk/playlists", {
			params: {
				owner_id: vkStore.user_id
			}
		}).catch(() => ({ playlists: [] }));

		playlists.value = data.playlists || [];
	}

	if (myPlaylists.value.length === 0) {
		return;
	}

		if (myPlaylists.value.length === 1) {
			const playlist = myPlaylists.value[0];
			if (playlist) {
				await playlistStore.addSongToPlaylist(props.audio, playlist).catch(console.error);
			}
			close();
			return;
		}

	showPlaylistList.value = true;
};

const handleSelectPlaylist = async (playlist: TPlaylist) => {
	if (!props.audio) {
		return;
	}

	await playlistStore.addSongToPlaylist(props.audio, playlist).catch(console.error);
	close();
};

const handleRemoveFromPlaylist = async () => {
	if (!props.audio || !currentPlaylist.value) {
		return;
	}

	await playlistStore.removeSongFromPlaylist(props.audio, currentPlaylist.value);
	close();
};

onMounted(async () => {
	const data = await $fetch<{ playlists: TPlaylist[] }>("/api/vk/playlists", {
		params: {
			owner_id: vkStore.user_id
		}
	}).catch(() => ({ playlists: [] }));

	playlists.value = data.playlists || [];
});
</script>

<style scoped lang="scss">
.song-actions-modal {
	width: 100%;
	max-width: 400px;
	background: var(--bg-secondary, #181818);
	border-radius: 16px;
	overflow: hidden;
	display: flex;
	flex-direction: column;
	max-height: 80vh;
	box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);

	@media (max-width: 768px) {
		max-width: 100%;
		width: 100%;
		max-height: 85vh;
		border-radius: 20px 20px 0 0;
	}
}

.modal-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 20px;
	border-bottom: 1px solid var(--border, #282828);
}

.modal-title {
	font-size: 20px;
	font-weight: 700;
	color: var(--text, #fff);
	margin: 0;
}

.modal-close {
	background: none;
	border: none;
	color: var(--text-secondary, #b3b3b3);
	cursor: pointer;
	padding: 4px;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 50%;
	transition: all 0.2s;

	&:hover {
		background: var(--hover, #2a2a2a);
		color: var(--text, #fff);
	}
}

.modal-content {
	flex: 1;
	overflow-y: auto;
	padding: 16px;
}

.song-info-section {
	display: flex;
	align-items: center;
	gap: 16px;
	padding: 16px;
	background: var(--bg-primary, #121212);
	border-radius: 12px;
	margin-bottom: 16px;
}

.song-cover {
	border-radius: 8px;
	overflow: hidden;
	flex-shrink: 0;
}

.song-details {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.song-title {
	font-size: 16px;
	font-weight: 600;
	color: var(--text, #fff);
	line-height: 1.4;
	overflow: hidden;
	text-overflow: ellipsis;
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
}

.song-artist {
	font-size: 14px;
	color: var(--text-secondary, #b3b3b3);
	line-height: 1.3;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.actions-list {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.action-item {
	display: flex;
	align-items: center;
	gap: 16px;
	padding: 16px;
	background: transparent;
	border: none;
	border-radius: 12px;
	color: var(--text, #fff);
	cursor: pointer;
	transition: all 0.2s;
	text-align: left;
	width: 100%;

	&:hover {
		background: var(--hover, #2a2a2a);
	}

	&:active {
		transform: scale(0.98);
	}

	:deep(svg) {
		flex-shrink: 0;
		color: var(--text-secondary, #b3b3b3);
	}

	span {
		font-size: 16px;
		font-weight: 400;
	}
}

.playlist-section {
	margin-bottom: 8px;
	border: 1px solid var(--border, #282828);
	border-radius: 12px;
	overflow: hidden;
}

.playlist-section-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 12px 16px;
	background: var(--bg-primary, #121212);
	border-bottom: 1px solid var(--border, #282828);
}

.playlist-section-title {
	font-size: 14px;
	font-weight: 600;
	color: var(--text-secondary, #b3b3b3);
}

.playlist-section-close {
	background: none;
	border: none;
	color: var(--text-secondary, #b3b3b3);
	cursor: pointer;
	padding: 4px;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 4px;
	transition: all 0.2s;

	&:hover {
		background: var(--hover, #2a2a2a);
		color: var(--text, #fff);
	}
}

.playlist-list {
	max-height: 200px;
	overflow-y: auto;
}

.playlist-item {
	display: flex;
	align-items: center;
	gap: 12px;
	width: 100%;
	padding: 12px 16px;
	background: transparent;
	border: none;
	border-radius: 0;
	color: var(--text, #fff);
	cursor: pointer;
	transition: all 0.2s;
	text-align: left;
	font-size: 15px;

	&:hover {
		background: var(--hover, #2a2a2a);
	}

	&:active {
		transform: scale(0.98);
	}
}

.playlist-item-cover {
	flex-shrink: 0;
	width: 32px;
	height: 32px;
	border-radius: 6px;
	overflow: hidden;
}

.playlist-item-title {
	flex: 1;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.no-playlists {
	padding: 24px;
	text-align: center;
	color: var(--text-secondary, #b3b3b3);
	font-size: 14px;
}
</style>

