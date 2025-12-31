<template>
	<div class="edit-track-modal">
		<div class="modal-header">
			<h2 class="modal-title">Редактировать трек</h2>
		</div>

		<div class="modal-content">
			<div class="form-section">
				<div class="input-group">
					<label class="input-label">Исполнитель</label>
					<input
						v-model="performer"
						type="text"
						class="input-field"
						placeholder="Введите исполнителя"
						:disabled="loading"
						@keydown.enter="handleSave"
					/>
				</div>

				<div class="input-group">
					<label class="input-label">Название</label>
					<input
						v-model="title"
						type="text"
						class="input-field"
						placeholder="Введите название трека"
						:disabled="loading"
						@keydown.enter="handleSave"
					/>
				</div>

				<div class="input-group">
					<label class="input-label">Текст песни</label>
					<textarea
						v-model="lyrics"
						class="textarea-field"
						placeholder="Введите текст песни (необязательно)"
						:disabled="loading"
						rows="6"
					/>
				</div>

				<div class="input-group">
					<label class="input-label">Жанр</label>
					<select
						v-model="genre"
						class="select-field"
						:disabled="loading"
					>
						<option
							v-for="(genreName, genreId) in genres"
							:key="genreId"
							:value="Number(genreId)"
						>
							{{ genreName }}
						</option>
					</select>
				</div>

				<div class="input-group">
					<label class="checkbox-label">
						<input
							v-model="privacy"
							type="checkbox"
							class="checkbox-input"
							:disabled="loading"
						/>
						<span>Скрыть от других</span>
					</label>
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
import type { TAudio } from "~~/server/utils/types";
import { useAudioActions } from "~/composables/useAudioActions";
import { useModal } from "~/composables/useModal";
import { usePlayerStore } from "~/stores/player";

const props = defineProps<{
	audio: TAudio;
}>();

const { editAudio, getLyrics } = useAudioActions();
const { closeModal } = useModal();
const playerStore = usePlayerStore();

const performer = ref("");
const title = ref("");
const lyrics = ref("");
const genre = ref(0);
const privacy = ref(false);
const loading = ref(false);

const genres: Record<number, string> = {
	1: "Rock",
	2: "Pop",
	3: "Rap & Hip-Hop",
	4: "Easy Listening",
	5: "Dance & House",
	6: "Instrumental",
	7: "Metal",
	21: "Alternative",
	8: "Dubstep",
	1001: "Jazz & Blues",
	10: "Drum & Bass",
	11: "Trance",
	12: "Chanson",
	13: "Ethnic",
	14: "Acoustic & Vocal",
	15: "Reggae",
	16: "Classical",
	17: "Indie Pop",
	19: "Speech",
	22: "Electropop & Disco",
	18: "Other"
};

const disabled = computed(() => {
	return !performer.value.trim() || !title.value.trim() || loading.value;
});

onMounted(async () => {
	performer.value = props.audio.performer || "";
	title.value = props.audio.title || "";

	if (props.audio.lyrics) {
		const lyricsInfo = await getLyrics(props.audio).catch(() => null);
		if (lyricsInfo?.lyrics) {
			if (lyricsInfo.lyrics.timestamps) {
				lyrics.value = lyricsInfo.lyrics.timestamps.map((timestamp: any) => timestamp.line).join("\n");
			} else if (lyricsInfo.lyrics.text) {
				lyrics.value = lyricsInfo.lyrics.text.join("\n");
			} else if (lyricsInfo.lyrics.ugc) {
				lyrics.value = lyricsInfo.lyrics.ugc.replaceAll("<br>", "\n");
			}
		}
	}
});

const handleSave = async () => {
	if (disabled.value) {
		return;
	}

	loading.value = true;

	const result = await editAudio(props.audio, {
		performer: performer.value.trim(),
		title: title.value.trim(),
		lyrics: lyrics.value.trim() || undefined,
		genre: genre.value || undefined,
		privacy: privacy.value ? 1 : 0
	}).catch((error) => {
		console.error("Failed to edit track:", error);
		return null;
	});

	loading.value = false;

	if (result) {
		if (playerStore.song?.full_id === props.audio.full_id) {
			playerStore.song = { ...playerStore.song, ...result };
		}
		closeModal();
	}
};

const handleCancel = () => {
	closeModal();
};
</script>

<style scoped lang="scss">
.edit-track-modal {
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
.textarea-field,
.select-field {
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
	min-height: 120px;
}

.select-field {
	cursor: pointer;
}

.checkbox-label {
	display: flex;
	align-items: center;
	gap: 8px;
	cursor: pointer;
	color: var(--text, #fff);
	font-size: 14px;
}

.checkbox-input {
	width: 18px;
	height: 18px;
	cursor: pointer;
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

