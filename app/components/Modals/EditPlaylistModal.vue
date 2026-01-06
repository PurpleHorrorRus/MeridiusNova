<template>
	<div class="edit-playlist-modal">
		<div class="modal-header">
			<h2 class="modal-title">Редактировать плейлист</h2>
		</div>

		<div class="modal-content">
			<div class="cover-section">
				<div class="cover-wrapper" @click="selectImage">
					<Cover
						v-if="image"
						:src="image"
						class="cover-image"
					/>
					<div v-else class="cover-placeholder">
						<Icon name="mdi:image-outline" size="48" />
						<span>Выбрать обложку</span>
					</div>
				</div>

				<input
					ref="fileInputRef"
					type="file"
					accept="image/jpeg,image/jpg,image/png"
					style="display: none"
					@change="handleFileSelect"
				/>
			</div>

			<div class="form-section">
				<div class="input-group">
					<label class="input-label">Название</label>
					<input
						v-model="title"
						type="text"
						class="input-field"
						placeholder="Введите название плейлиста"
						:disabled="loading"
						@keydown.enter="handleSave"
					/>
				</div>

				<div class="input-group">
					<label class="input-label">Описание</label>
					<textarea
						v-model="description"
						class="textarea-field"
						placeholder="Введите описание плейлиста (необязательно)"
						:disabled="loading"
						rows="4"
					/>
				</div>
			</div>
		</div>

		<div class="modal-footer">
			<button
				class="button button-secondary"
				:disabled="loading"
				@click="handleCancel"
			>
				Отмена
			</button>
			<button
				class="button button-primary"
				:disabled="disabled || loading"
				@click="handleSave"
			>
				<Icon v-if="loading" name="mdi:loading" size="20" class="loading-icon" />
				Сохранить
			</button>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import type { TPlaylist } from "~~/server/utils/types";
import { usePlaylistStore } from "~/stores/playlist";
import { useModalStore } from "~/stores/modal";
import { useVkStore } from "~/stores/vk";
import { isTauri } from "~/utils/tauri";

const props = defineProps<{
	playlist: TPlaylist;
}>();

const playlistStore = usePlaylistStore();
const modalStore = useModalStore();
const vkStore = useVkStore();

const title = ref("");
const description = ref("");
const image = ref<string | null>(null);
const coverFile = ref<File | null>(null);
const loading = ref(false);
const fileInputRef = ref<HTMLInputElement | null>(null);

onMounted(() => {
	title.value = props.playlist.title || "";
	description.value = props.playlist.description || "";
	image.value = props.playlist.cover_url || null;
});

const disabled = computed(() => {
	return !title.value.trim() || loading.value;
});

const selectImage = () => {
	fileInputRef.value?.click();
};

const handleFileSelect = (event: Event) => {
	const target = event.target as HTMLInputElement;
	const file = target.files?.[0];

	if (file) {
		coverFile.value = file;
		const reader = new FileReader();
		reader.onload = (e) => {
			image.value = e.target?.result as string;
		};
		reader.readAsDataURL(file);
	}
};

const handleSave = async () => {
	if (disabled.value) {
		return;
	}

	loading.value = true;

	const result = await playlistStore.editPlaylist({
		playlist_id: props.playlist.playlist_id,
		title: title.value.trim(),
		description: description.value.trim() || undefined,
		cover: coverFile.value || undefined
	}).catch((error) => {
		console.error("Failed to edit playlist:", error);
		return null;
	});

	loading.value = false;

	if (result) {
		// Обновляем список плейлистов
		await vkStore.refreshPlaylists();
		
		if (isTauri() && typeof window !== "undefined") {
			const { useTray } = await import("~/composables/useTray");
			const tray = useTray();
			await tray.loadPlaylists();
		}
		
		modalStore.close();
	}
};

const handleCancel = () => {
	closeModal();
};
</script>

<style scoped lang="scss">
.edit-playlist-modal {
	display: flex;
	flex-direction: column;
	height: 100%;
	padding: 24px;
}

.modal-header {
	margin-bottom: 24px;
}

.modal-title {
	font-size: 24px;
	font-weight: 700;
	color: var(--text, #fff);
	margin: 0;
}

.modal-content {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 24px;
	overflow-y: auto;
}

.cover-section {
	display: flex;
	justify-content: center;
}

.cover-wrapper {
	width: 200px;
	height: 200px;
	border-radius: 8px;
	overflow: hidden;
	cursor: pointer;
	background: var(--bg-secondary, #181818);
	border: 2px dashed var(--border, #282828);
	transition: all 0.2s;
	display: flex;
	align-items: center;
	justify-content: center;

	&:hover {
		border-color: var(--secondary, #e9003f);
		background: var(--bg-hover, #2a2a2a);
	}
}

.cover-image {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.cover-placeholder {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 8px;
	color: var(--text-secondary, #b3b3b3);
	font-size: 14px;
}

.form-section {
	display: flex;
	flex-direction: column;
	gap: 16px;
}

.input-group {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.input-label {
	font-size: 14px;
	font-weight: 500;
	color: var(--text, #fff);
}

.input-field,
.textarea-field {
	width: 100%;
	padding: 12px 16px;
	background: var(--bg-secondary, #181818);
	border: 1px solid var(--border, #282828);
	border-radius: 8px;
	color: var(--text, #fff);
	font-size: 14px;
	font-family: inherit;
	transition: all 0.2s;

	&:focus {
		outline: none;
		border-color: var(--secondary, #e9003f);
	}

	&:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
}

.textarea-field {
	resize: vertical;
	min-height: 80px;
}

.modal-footer {
	display: flex;
	justify-content: flex-end;
	gap: 12px;
	margin-top: 24px;
	padding-top: 24px;
	border-top: 1px solid var(--border, #282828);
}

.button {
	padding: 12px 24px;
	border-radius: 8px;
	font-size: 14px;
	font-weight: 600;
	cursor: pointer;
	transition: all 0.2s;
	border: none;
	display: flex;
	align-items: center;
	gap: 8px;

	&:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
}

.button-primary {
	background: var(--secondary, #e9003f);
	color: var(--text, #fff);

	&:hover:not(:disabled) {
		background: var(--primary-hover, #ff1a5c);
	}
}

.button-secondary {
	background: var(--bg-secondary, #181818);
	color: var(--text, #fff);
	border: 1px solid var(--border, #282828);

	&:hover:not(:disabled) {
		background: var(--bg-hover, #2a2a2a);
	}
}

.loading-icon {
	animation: spin 1s linear infinite;
}

@keyframes spin {
	from {
		transform: rotate(0deg);
	}
	to {
		transform: rotate(360deg);
	}
}
</style>

