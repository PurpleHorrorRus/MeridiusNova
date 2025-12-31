<template>
	<div class="song-actions" @click.stop>
	<button
		v-if="canAdd"
		class="action-button"
		@click="handleAdd"
		title="Добавить в библиотеку"
	>
		<Icon name="mdi:plus" size="18" />
	</button>

	<button
		v-else-if="canDelete"
		class="action-button"
		@click="handleDelete"
		:title="deleteTitle"
	>
		<Icon name="mdi:close" size="18" />
	</button>

	<button
		v-if="canEdit"
			class="action-button"
			@click="handleEdit"
			title="Редактировать"
		>
			<Icon name="mdi:pencil" size="18" />
		</button>

		<button
			v-if="hasLyrics"
			class="action-button"
			@click="handleLyrics"
			title="Текст песни"
		>
			<Icon name="mdi:text" size="18" />
		</button>

		<button
			v-if="canDownload"
			class="action-button"
			@click="handleDownload"
			title="Скачать"
		>
			<Icon name="mdi:download" size="18" />
		</button>

		<button
			v-if="canShare"
			class="action-button"
			@click="handleShare"
			title="Поделиться"
		>
			<Icon name="mdi:share" size="18" />
		</button>

		<button
			class="action-button"
			@click="handleSimilar"
			title="Найти похожее"
		>
			<Icon name="mdi:music-note" size="18" />
		</button>
	</div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { TAudio } from "~~/server/utils/types";
import { useAudioActions } from "~/composables/useAudioActions";
import { useModal } from "~/composables/useModal";
import { useSongProps } from "~/composables/useSongProps";
import { usePlaylist } from "~/composables/usePlaylist";
import { usePlaylistStore } from "~/stores/playlist";
import { usePlaylistActions } from "~/composables/usePlaylistActions";
import { useVkStore } from "~/stores/vk";

const props = defineProps<{
	audio: TAudio;
}>();

const { addAudio, deleteAudio, downloadAudio, shareAudio, getSimilarTracks } = useAudioActions();
const { openModal } = useModal();
const { generateSongProps } = useSongProps();
const { current, playing } = usePlaylist();
const playlistStore = usePlaylistStore();
const { removeSongFromPlaylist } = usePlaylistActions();

const songProps = computed(() => generateSongProps(props.audio));
const vkStore = useVkStore();

const canAdd = computed(() => songProps.value.canAdd);

const currentPlaylist = computed(() => {
	return playing.value || current.value;
});

const canDelete = computed(() => {
	// Можно удалить из библиотеки
	if (songProps.value.canDelete) {
		return true;
	}
	
	// Можно удалить из плейлиста пользователя
	const playlist = currentPlaylist.value;
	if (playlist && playlist.playlist_id >= 0 && playlist.owner_id === vkStore.user_id) {
		return true;
	}
	
	return false;
});

const deleteTitle = computed(() => {
	const playlist = currentPlaylist.value;
	
	// Если это плейлист пользователя (не библиотека)
	if (playlist && playlist.playlist_id >= 0 && playlist.owner_id === vkStore.user_id) {
		return "Удалить из плейлиста";
	}
	
	return "Удалить из библиотеки";
});

const canEdit = computed(() => {
	return props.audio.can_edit;
});

const hasLyrics = computed(() => {
	return Boolean(props.audio.lyrics);
});

const canDownload = computed(() => {
	return !props.audio.is_restriction;
});

const canShare = computed(() => {
	return !props.audio.is_restriction;
});

const handleAdd = async () => {
	await addAudio(props.audio).catch(console.error);
};

const handleDelete = async () => {
	const playlist = currentPlaylist.value;
	
	// Определяем, удаляем из плейлиста или из библиотеки
	// Логика как в старом проекте: если playlist_id >= 0, плейлист принадлежит пользователю и нет addedSong - удаляем из плейлиста
	const shouldRemoveFromPlaylist = playlist 
		&& playlist.playlist_id >= 0 
		&& playlist.owner_id === vkStore.user_id
		&& !(props.audio as any).addedSong;
	
	let result;
	
	if (shouldRemoveFromPlaylist) {
		// Удаляем из плейлиста
		result = await removeSongFromPlaylist(props.audio, playlist).catch(console.error);
		
		if (result?.success) {
			// Обновляем размер плейлиста
			if (playlist.size !== undefined) {
				playlist.size = Math.max(0, (playlist.size || 0) - 1);
			}
		}
	} else {
		// Удаляем из библиотеки
		result = await deleteAudio(props.audio).catch(console.error);
	}
	
	if (result?.success) {
		// Обновляем состояние: удаляем трек из плейлистов и очереди
		playlistStore.removeSongByFullId(props.audio.full_id);
		
		// Если удаленный трек был текущим, переключаемся на следующий
		const currentSong = playlistStore.currentSong;
		if (currentSong && currentSong.full_id === props.audio.full_id) {
			playlistStore.next();
		}
	}
};

const handleEdit = () => {
	openModal("editTrack", { audio: props.audio });
};

const handleLyrics = () => {
	openModal("lyrics", { audio: props.audio });
};

const handleDownload = async () => {
	await downloadAudio(props.audio).catch(console.error);
};

const handleShare = () => {
	openModal("shareAudio", { audio: props.audio });
};

const handleSimilar = async () => {
	const result = await getSimilarTracks(props.audio).catch(() => null);
	if (result) {
		navigateTo(`/songs/${props.audio.id}?audio_owner_id=${props.audio.owner_id}`);
	}
};
</script>

<style scoped lang="scss">
.song-actions {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: 8px;
}

.action-button {
	background: none;
	border: none;
	color: var(--text-secondary, #b3b3b3);
	cursor: pointer;
	padding: 4px;
	border-radius: 4px;
	transition: all 0.2s;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 20px;
	height: 20px;

	&:hover {
		color: var(--text, #fff);
		background: var(--bg-hover, rgba(255, 255, 255, 0.1));
	}
}
</style>

