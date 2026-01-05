<template>
	<div class="song-actions" @click.stop>
	<button
		v-if="songProps.canAdd"
		class="action-button"
		@click="handleAdd"
		title="Добавить в библиотеку"
	>
		<Icon name="mdi:heart-outline" size="22" />
	</button>

	<button
		v-else-if="canDelete"
		class="action-button"
		@click="handleDelete"
		:title="deleteTitle"
	>
		<Icon name="mdi:heart" size="22" />
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
import { useSongDelete } from "~/composables/useSongDelete";
import { useSongAdd } from "~/composables/useSongAdd";
import { useIsTauri } from "~/composables/useIsTauri";
import { navigateToSimilarTracks } from "~/utils/navigation";

const props = defineProps<{
	audio: TAudio;
}>();

const { downloadAudio, shareAudio, getSimilarTracks } = useAudioActions();
const { openModal } = useModal();
const { generateSongProps } = useSongProps();
const songsContext = useSongsContext();
const { handleDelete: deleteSong, getDeleteTitle, canDelete: canDeleteSong } = useSongDelete();
const { handleAdd: addSong } = useSongAdd();
const { isTauri } = useIsTauri();
const { settings } = useSettings();

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

const canDelete = computed(() => {
	return canDeleteSong(audio.value, songProps.value);
});

const deleteTitle = computed(() => {
	return getDeleteTitle(audio.value);
});

const canEdit = computed(() => {
	return audio.value.can_edit;
});

const hasLyrics = computed(() => {
	return Boolean(audio.value.lyrics);
});

const canDownload = computed(() => {
	return !audio.value.is_restriction && settings.value.download.enable;
});

const canShare = computed(() => {
	return !audio.value.is_restriction;
});

const handleAdd = async () => {
	await addSong(audio.value);
};

const handleDelete = async () => {
	await deleteSong(audio.value);
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
		navigateToSimilarTracks(audio.value);
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
	transition: background-color 0.2s, color 0.2s;
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

