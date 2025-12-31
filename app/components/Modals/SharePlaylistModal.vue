<template>
	<div class="share-playlist-modal">
		<div class="modal-header">
			<h2 class="modal-title">Поделиться плейлистом</h2>
		</div>

		<div class="modal-content">
			<div class="share-options">
				<label class="checkbox-label">
					<input
						v-model="toWall"
						type="checkbox"
						class="checkbox-input"
					/>
					<span>На стену</span>
				</label>
			</div>

			<div v-if="!toWall" class="friends-section">
				<label class="input-label">Выберите друга</label>
				<input
					v-model="friendSearch"
					type="text"
					class="input-field"
					placeholder="Поиск друга..."
				/>
				<div class="friends-list">
					<div
						v-for="friend in filteredFriends"
						:key="friend.id"
						class="friend-item"
						:class="{ active: selectedFriend === friend.id }"
						@click="selectFriend(friend.id)"
					>
						<img
							v-if="friend.photo_100"
							:src="friend.photo_100"
							:alt="friend.first_name"
							class="friend-avatar"
						/>
						<div class="friend-info">
							<span class="friend-name">{{ friend.first_name }} {{ friend.last_name }}</span>
						</div>
					</div>
				</div>
			</div>

			<div class="message-section">
				<label class="input-label">Сообщение</label>
				<textarea
					v-model="message"
					class="textarea-field"
					placeholder="Введите сообщение (необязательно)"
					rows="4"
				/>
			</div>
		</div>

		<div class="modal-footer">
			<button
				class="button button-secondary"
				@click="handleCancel"
			>
				Отмена
			</button>
			<button
				class="button button-primary"
				:disabled="disabled || loading"
				@click="handleShare"
			>
				<Icon v-if="loading" name="mdi:loading" size="20" class="loading-icon" />
				Поделиться
			</button>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import type { TPlaylist } from "~~/server/utils/types";
import { useModal } from "~/composables/useModal";

const props = defineProps<{
	playlist: TPlaylist;
}>();

const { closeModal } = useModal();

const toWall = ref(true);
const friendSearch = ref("");
const selectedFriend = ref<number | null>(null);
const message = ref("");
const loading = ref(false);
const friends = ref<Array<{
	id: number;
	first_name: string;
	last_name: string;
	photo_100?: string;
}>>([]);

const filteredFriends = computed(() => {
	if (!friendSearch.value.trim()) {
		return friends.value;
	}

	const search = friendSearch.value.toLowerCase();
	return friends.value.filter((friend) => {
		const fullName = `${friend.first_name} ${friend.last_name}`.toLowerCase();
		return fullName.includes(search);
	});
});

const disabled = computed(() => {
	if (toWall.value) {
		return false;
	}

	return !selectedFriend.value;
});

const selectFriend = (friendId: number) => {
	selectedFriend.value = friendId;
};

const handleShare = async () => {
	if (disabled.value || loading.value) {
		return;
	}

	loading.value = true;

	const { owner_id, playlist_id, access_hash } = props.playlist;
	let attachment = `audio_playlist${owner_id}_${playlist_id}`;

	if (access_hash) {
		attachment += `_${access_hash}`;
	}

	const result = await $fetch("/api/vk/share", {
		method: "POST",
		body: {
			attachment,
			peer_id: toWall.value ? null : selectedFriend.value,
			message: message.value || undefined,
			toWall: toWall.value
		}
	}).catch((error) => {
		console.error("Failed to share playlist:", error);
		return null;
	});

	loading.value = false;

	if (result) {
		closeModal();
	}
};

const handleCancel = () => {
	closeModal();
};

// Загружаем список друзей при монтировании
onMounted(async () => {
	const friendsData = await $fetch<Array<{
		id: number;
		first_name: string;
		last_name: string;
		photo_100?: string;
	}>>("/api/vk/friends").catch(() => []);

	friends.value = friendsData || [];
});
</script>

<style scoped lang="scss">
.share-playlist-modal {
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

.share-options {
	display: flex;
	align-items: center;
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

.friends-section {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.friends-list {
	max-height: 200px;
	overflow-y: auto;
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.friend-item {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 8px 12px;
	border-radius: 8px;
	cursor: pointer;
	transition: all 0.2s;
	background: var(--bg-secondary, #181818);
	border: 1px solid transparent;

	&:hover {
		background: var(--bg-hover, #2a2a2a);
	}

	&.active {
		background: var(--bg-hover, #2a2a2a);
		border-color: var(--secondary, #e9003f);
	}
}

.friend-avatar {
	width: 40px;
	height: 40px;
	border-radius: 50%;
	object-fit: cover;
}

.friend-info {
	display: flex;
	flex-direction: column;
}

.friend-name {
	font-size: 14px;
	font-weight: 500;
	color: var(--text, #fff);
}

.message-section {
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

