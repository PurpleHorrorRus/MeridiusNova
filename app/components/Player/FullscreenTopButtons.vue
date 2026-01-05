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
	gap: min(12px, 1.5vh);
	width: 100%;
	margin-bottom: min(16px, 2vh);
	flex-wrap: nowrap;

	@media (max-height: 700px) {
		gap: min(10px, 1.2vh);
		margin-bottom: min(14px, 1.8vh);
	}

	@media (max-height: 600px) {
		gap: min(8px, 1vh);
		margin-bottom: min(12px, 1.5vh);
	}

	@media (max-width: 768px) {
		gap: min(8px, 1vh);
		margin-bottom: min(12px, 1.5vh);
		width: auto;
	}

	@media (max-width: 480px) {
		gap: min(6px, 0.8vh);
		margin-bottom: min(8px, 1vh);
	}

	&.fullscreen-top-buttons-desktop {
		width: auto;
		margin-bottom: 0;
		gap: min(12px, 1.5vh);
		justify-content: flex-start;
		flex-shrink: 0;
	}
}

.btn-fullscreen-vk {
	background: rgba(255, 255, 255, 0.1);
	border: none;
	border-radius: 50%;
	width: min(44px, 4.5vh);
	aspect-ratio: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	color: rgba(255, 255, 255, 0.7);
	cursor: pointer;
	transition: transform 0.2s ease, background-color 0.2s ease, color 0.2s ease;

	@media (max-height: 700px) {
		width: min(40px, 4vh);
	}

	@media (max-height: 600px) {
		width: min(36px, 3.5vh);
	}

	@media (max-width: 768px) {
		width: min(40px, 4vh);
	}

	@media (max-width: 480px) {
		width: min(36px, 3.5vh);
	}

	&:hover {
		background: rgba(255, 255, 255, 0.15);
		color: #fff;
	}

	&:active {
		opacity: 0.8;
	}
}
</style>

