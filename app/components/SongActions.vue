<template>
	<div class="song-actions" @click.stop>
	<button
		v-if="canAdd"
		class="action-button"
		@click="handleAdd"
		title="Добавить в библиотеку"
	>
		<Icon name="mdi:plus" size="22" />
	</button>

	<button
		v-else-if="canDelete"
		class="action-button"
		@click="handleDelete"
		:title="deleteTitle"
	>
		<Icon name="mdi:close" size="22" />
	</button>

	<button
		v-if="canEdit"
			class="action-button"
			@click="handleEdit"
			title="Редактировать"
		>
			<Icon name="mdi:pencil" size="22" />
		</button>

		<button
			v-if="hasLyrics"
			class="action-button"
			@click="handleLyrics"
			title="Текст песни"
		>
			<Icon name="mdi:text" size="22" />
		</button>

		<button
			v-if="canDownload"
			class="action-button"
			@click="handleDownload"
			title="Скачать"
		>
			<Icon name="mdi:download" size="22" />
		</button>

		<button
			v-if="canShare"
			class="action-button"
			@click="handleShare"
			title="Поделиться"
		>
			<Icon name="mdi:share" size="22" />
		</button>

		<button
			class="action-button"
			@click="handleSimilar"
			title="Найти похожее"
		>
			<Icon name="mdi:music-note" size="22" />
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
import { useUpdateTrack } from "~/composables/useUpdateTrack";

const props = defineProps<{
	audio: TAudio;
}>();

const { addAudio, deleteAudio, downloadAudio, shareAudio, getSimilarTracks } = useAudioActions();
const { openModal } = useModal();
const { generateSongProps } = useSongProps();
const { current, playing } = usePlaylist();
const playlistStore = usePlaylistStore();
const { removeSongFromPlaylist } = usePlaylistActions();
const { updateTrackInAllPlaces } = useUpdateTrack();
const songsContext = useSongsContext();

// Получаем актуальный трек из songsContext для реактивности
const audio = computed(() => {
	if (songsContext?.value) {
		const found = songsContext.value.find(t => t.id === props.audio.id);
		if (found) {
			return found;
		}
	}
	return props.audio;
});

const songProps = computed(() => {
	const result = generateSongProps(audio.value);
	return result;
});
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
	return audio.value.can_edit;
});

const hasLyrics = computed(() => {
	return Boolean(audio.value.lyrics);
});

const canDownload = computed(() => {
	return !audio.value.is_restriction;
});

const canShare = computed(() => {
	return !audio.value.is_restriction;
});

const handleAdd = async () => {
	const currentAudio = audio.value;
	
	// Для API используем оригинальный owner_id (не user_id, если трек уже был добавлен)
	const audioForApi = currentAudio.owner_id !== vkStore.user_id
		? currentAudio
		: { ...currentAudio, owner_id: (currentAudio as any).original_owner_id || currentAudio.owner_id, full_id: `${(currentAudio as any).original_owner_id || currentAudio.owner_id}_${currentAudio.id}` };
	
	const updatedSong = await addAudio(audioForApi).catch(console.error);
	
	if (updatedSong) {
		// Обновляем оригинальный трек, сохраняя полный объект трека из библиотеки в addedSong
		// НЕ меняем owner_id и full_id, чтобы трек не потерялся
		const updatedTrack = {
			...currentAudio,
			addedSong: updatedSong,
			can_add: updatedSong.can_add,
			can_delete: updatedSong.can_delete
		};
		
		updateTrackInAllPlaces(currentAudio.id, () => updatedTrack);
	}
};

const handleDelete = async () => {
	const currentAudio = audio.value;
	const playlist = currentPlaylist.value;
	
	// Определяем, удаляем из плейлиста или из библиотеки
	// Если трек добавлен в библиотеку (addedSong !== undefined), удаляем из библиотеки
	// Если трек в плейлисте пользователя (playlist_id >= 0, owner_id === user_id) и не в библиотеке - удаляем из плейлиста
	const isInLibrary = Boolean(currentAudio.addedSong) || currentAudio.owner_id === vkStore.user_id;
	const shouldRemoveFromPlaylist = playlist 
		&& playlist.playlist_id >= 0 
		&& playlist.owner_id === vkStore.user_id
		&& !isInLibrary
		&& !currentAudio.addedSong;
	
	let result;
	
	if (shouldRemoveFromPlaylist) {
		// Удаляем из плейлиста
		result = await removeSongFromPlaylist(currentAudio, playlist).catch(console.error);
		
		if (result?.success) {
			// Обновляем размер плейлиста
			if (playlist.size !== undefined) {
				playlist.size = Math.max(0, (playlist.size || 0) - 1);
			}
		}
	} else if (isInLibrary) {
		// Удаляем из библиотеки, используя трек из addedSong
		const songToDelete = currentAudio.addedSong || currentAudio;
		
		result = await deleteAudio(songToDelete).catch(console.error);
		
		if (result?.success) {
			// Проверяем, находимся ли мы на странице библиотеки пользователя
			// Важно: playlist - это ТЕКУЩИЙ ПЛЕЙЛИСТ ВОСПРОИЗВЕДЕНИЯ, а не плейлист на странице!
			// Поэтому проверяем ТОЛЬКО route, а НЕ playlist из usePlaylist
			const route = useRoute();
			
			// Библиотека - это страница где показывается "Моя музыка" (playlist_id === -1)
			// Нужно проверить все возможные варианты:
			// 1. /collection
			// 2. /playlist/:owner_id/-1
			// 3. Возможно, есть другие форматы?
			const isUserLibraryPage = route.path.startsWith('/collection') 
				|| route.path.match(/\/playlist\/\d+\/-1$/);
			
			// Удаляем трек из списка ТОЛЬКО если мы на странице библиотеки пользователя
			// В остальных случаях (поиск, другие плейлисты) просто убираем addedSong и обновляем флаги
			const shouldRemoveFromList = Boolean(isUserLibraryPage);
			
			if (shouldRemoveFromList) {
				// Удаляем трек из списка (только на странице библиотеки)
				updateTrackInAllPlaces(currentAudio.id, () => null, true);
			} else {
				// Удаляем addedSong и обновляем флаги, НЕ меняя owner_id и full_id
				// Это позволяет треку остаться в списке (например, в поиске), но без addedSong
				updateTrackInAllPlaces(currentAudio.id, (track) => {
					const { addedSong, ...trackWithoutAddedSong } = track;
					return {
						...trackWithoutAddedSong,
						can_add: true,
						can_delete: false
					};
				}, false);
			}
		}
	}
	
	if (result?.success) {
		// Обновляем состояние: удаляем трек из плейлистов и очереди
		playlistStore.removeSongByFullId(currentAudio.full_id);
		
		// Если удаленный трек был текущим, переключаемся на следующий
		const currentSong = playlistStore.currentSong;
		if (currentSong && currentSong.full_id === currentAudio.full_id) {
			playlistStore.next();
		}
	}
};

const handleEdit = () => {
	openModal("editTrack", { audio: audio.value });
};

const handleLyrics = () => {
	openModal("lyrics", { audio: audio.value });
};

const handleDownload = async () => {
	await downloadAudio(audio.value).catch(console.error);
};

const handleShare = () => {
	openModal("shareAudio", { audio: audio.value });
};

const handleSimilar = async () => {
	const result = await getSimilarTracks(audio.value).catch(() => null);
	if (result) {
		navigateTo(`/songs/${audio.value.id}?audio_owner_id=${audio.value.owner_id}`);
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
	width: 24px;
	height: 24px;

	&:hover {
		color: var(--text, #fff);
		background: var(--bg-hover, rgba(255, 255, 255, 0.1));
	}
}
</style>

