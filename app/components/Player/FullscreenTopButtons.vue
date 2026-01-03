<template>
	<div class="fullscreen-top-buttons">
		<button
			v-if="songProps.canAdd"
			class="btn-fullscreen-vk"
			@click.stop="handleAdd"
			:title="t('player.addToLibrary')"
		>
			<Icon name="mdi:heart-outline" size="24" />
		</button>

		<button
			v-else-if="canDelete"
			class="btn-fullscreen-vk"
			@click.stop="handleDelete"
			:title="deleteTitle"
		>
			<Icon name="mdi:heart" size="24" />
		</button>

		<button
			v-if="songProps.hasLyrics"
			class="btn-fullscreen-vk"
			@click.stop="handleLyrics"
			:title="t('player.lyrics') || 'Текст песни'"
		>
			<Icon name="mdi:text" size="24" />
		</button>
	</div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useAudio } from "~/composables/useAudio";
import { useStrings } from "~/composables/useStrings";
import { useSongProps } from "~/composables/useSongProps";
import { useModal } from "~/composables/useModal";
import { useSongDelete } from "~/composables/useSongDelete";
import { useSongAdd } from "~/composables/useSongAdd";
import { useIsMobile } from "~/composables/useIsMobile";

const { currentSong } = useAudio();
const { getString } = useStrings();
const t = getString;
const { generateSongProps } = useSongProps();
const { openModal } = useModal();
const { handleDelete: deleteSong, getDeleteTitle, canDelete: canDeleteSong } = useSongDelete();
const { handleAdd: addSong } = useSongAdd();
const { isMobile } = useIsMobile();

const songProps = computed(() => {
	const song = currentSong.value;
	if (!song) {
		return {
			canAdd: false,
			canDelete: false,
			hasLyrics: false
		};
	}

	return generateSongProps(song);
});

const canDelete = computed(() => {
	if (!currentSong.value) {
		return false;
	}

	return canDeleteSong(currentSong.value, songProps.value);
});

const deleteTitle = computed(() => {
	if (!currentSong.value) {
		return "";
	}

	return getDeleteTitle(currentSong.value);
});

const handleAdd = async () => {
	if (!currentSong.value) {
		return;
	}

	await addSong(currentSong.value);
};

const handleDelete = async () => {
	if (!currentSong.value) {
		return;
	}

	await deleteSong(currentSong.value);
};

const handleLyrics = () => {
	if (!currentSong.value) {
		return;
	}

	if (isMobile.value) {
		openModal("lyrics", { audio: currentSong.value });
		return;
	}

	emit("toggleLyrics");
};

const emit = defineEmits<{
	toggleLyrics: [];
}>();
</script>

<style scoped lang="scss">
.fullscreen-top-buttons {
	display: flex;
	align-items: center;
	justify-content: flex-start;
	gap: 12px;
	width: 100%;
	margin-bottom: 16px;
	flex-wrap: nowrap;

	@media (max-width: 768px) {
		gap: 8px;
		margin-bottom: 12px;
		width: auto;
	}

	@media (max-width: 480px) {
		gap: 6px;
		margin-bottom: 8px;
	}

	&.fullscreen-top-buttons-desktop {
		width: auto;
		margin-bottom: 0;
		gap: 12px;
		justify-content: flex-start;
		flex-shrink: 0;
	}
}

.btn-fullscreen-vk {
	background: rgba(255, 255, 255, 0.1);
	border: none;
	border-radius: 50%;
	width: 44px;
	height: 44px;
	display: flex;
	align-items: center;
	justify-content: center;
	color: rgba(255, 255, 255, 0.7);
	cursor: pointer;
	transition: all 0.2s ease;
	backdrop-filter: blur(10px);

	@media (max-width: 768px) {
		width: 40px;
		height: 40px;
	}

	@media (max-width: 480px) {
		width: 36px;
		height: 36px;
	}

	&:hover {
		background: rgba(255, 255, 255, 0.15);
		color: #fff;
		transform: scale(1.05);
	}

	&:active {
		transform: scale(0.95);
	}
}
</style>

