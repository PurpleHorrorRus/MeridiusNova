<template>
	<div class="song-actions" @click.stop>
	<button
		v-if="canAdd"
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
import { storeToRefs } from "pinia";

import { useSettingsStore } from "~/stores/settings";
import { usePlaylistStore } from "~/stores/playlist";

import { useSongsContext } from "~/composables/useSongsContext";
import { useIsTauri } from "~/composables/useIsTauri";

import type { TAudio } from "~~/server/utils/types";

const props = defineProps<{
	audio: TAudio;
}>();

const emit = defineEmits<{
	action: [action: string, data?: any];
}>();

const songsContext = useSongsContext();
const playlistStore = usePlaylistStore();
const { isTauri } = useIsTauri();
const settingsStore = useSettingsStore();
const { settings } = storeToRefs(settingsStore);

const audio = computed(() => {
	if (songsContext?.value) {
		const found = songsContext.value.find(t => t.id === props.audio.id);
		if (found) {
			return found;
		}
	}
	return props.audio;
});

const canAdd = computed(() => {
	return Boolean(audio.value.canAdd);
});

const canDelete = computed(() => {
	return playlistStore.canDelete(audio.value, { canDelete: Boolean(audio.value.canDelete) });
});

const deleteTitle = computed(() => {
	return playlistStore.getDeleteTitle(audio.value);
});

const canEdit = computed(() => {
	return Boolean(audio.value.canEdit);
});

const hasLyrics = computed(() => {
	return Boolean(audio.value.hasLyrics);
});

const canDownload = computed(() => {
	return !audio.value.is_restriction && settings.value.download.enable;
});

const canShare = computed(() => {
	return Boolean(audio.value.canShare);
});

const handleAdd = () => {
	emit("action", "add", audio.value);
};

const handleDelete = () => {
	emit("action", "delete", audio.value);
};

const handleEdit = () => {
	emit("action", "edit", audio.value);
};

const handleLyrics = () => {
	emit("action", "lyrics", audio.value);
};

const handleDownload = () => {
	emit("action", "download", audio.value);
};

const handleShare = () => {
	emit("action", "share", audio.value);
};

const handleSimilar = () => {
	emit("action", "similar", audio.value);
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

