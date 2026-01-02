<template>
	<div class="playlist-header-wrapper" :style="headerStyle">
		<div class="playlist-header-full">
				<div class="playlist-header-cover">
					<Cover
						:src="playlist.cover_url"
					/>
				</div>

				<div class="playlist-header-info">
					<div class="playlist-header-type">{{ playlistType }}</div>
					<h1 class="playlist-header-title">{{ playlist.title }}</h1>

					<div v-if="playlist.description" class="playlist-header-description">
						{{ playlist.description }}
					</div>

					<div class="playlist-header-meta">
						<span v-if="playlist.author" class="playlist-header-author">
							{{ playlist.author.name }}
						</span>
						<span v-if="playlist.size !== undefined && playlist.size > 0" class="playlist-header-size">
							{{ playlist.size }} треков
						</span>
						<span v-if="playlist.listens && playlist.listens > 0" class="playlist-header-listens">
							{{ formatListens(playlist.listens) }} прослушиваний
						</span>
					</div>

					<div class="playlist-header-actions">
						<button @click="handlePlayPause" class="playlist-header-play-button" :disabled="isLoading">
							<Icon :name="isLoading ? 'mdi:loading' : (isPlaying ? 'mdi:pause' : 'mdi:play')" size="24" :class="{ 'loading-icon': isLoading }" />
							<span>{{ isLoading ? 'Загрузка...' : (isPlaying ? 'Пауза' : 'Воспроизвести') }}</span>
						</button>

						<button
							v-if="playlist.follow_hash"
							@click="handleFollow"
							class="playlist-header-follow-button"
							:class="{ active: playlist.followed }"
						>
							<Icon :name="playlist.followed ? 'mdi:heart' : 'mdi:heart-outline'" size="20" />
						</button>

						<div class="playlist-header-more-actions">
							<button
								class="playlist-header-action-button"
								@click="showActionsMenu = !showActionsMenu"
							>
								<Icon name="mdi:dots-vertical" size="20" />
							</button>

							<div v-if="showActionsMenu" class="actions-menu" @click.stop>
								<button
									v-if="canEdit"
									class="actions-menu-item"
									@click="handleEdit"
								>
									<Icon name="mdi:pencil" size="18" />
									<span>Редактировать</span>
								</button>

								<button
									v-if="canShare"
									class="actions-menu-item"
									@click="handleShare"
								>
									<Icon name="mdi:share-variant" size="18" />
									<span>Поделиться</span>
								</button>

								<button
									v-if="canDownload"
									class="actions-menu-item"
									@click="handleDownload"
								>
									<Icon name="mdi:download" size="18" />
									<span>Скачать</span>
								</button>

								<button
									v-if="canDelete"
									class="actions-menu-item actions-menu-item-danger"
									@click="handleDelete"
								>
									<Icon name="mdi:delete" size="18" />
									<span>Удалить</span>
								</button>
							</div>
						</div>
					</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useEventListener } from "~/composables/useEventListener";
import type { TPlaylist } from "~~/server/utils/types";
import { usePlaylistActions } from "~/composables/usePlaylistActions";
import { useModal } from "~/composables/useModal";
import { useVkStore } from "~/stores/vk";
import EditPlaylistModal from "~/components/Modals/EditPlaylistModal.vue";
import SharePlaylistModal from "~/components/Modals/SharePlaylistModal.vue";

const props = defineProps<{
	playlist: TPlaylist;
}>();

const emit = defineEmits<{
	play: [playlist: TPlaylist];
	follow: [playlist: TPlaylist];
}>();

const { isPlaying, isLoading, handlePlayPause: handlePlayPauseBase } = usePlaylistButton(props.playlist);
const { deletePlaylist, downloadPlaylist } = usePlaylistActions();
const { openModal, openConfirm, openCustom } = useModal();
const vkStore = useVkStore();

const showActionsMenu = ref(false);

const canEdit = computed(() => {
	return props.playlist.owner_id === vkStore.user_id || props.playlist.permissions?.edit;
});

const canShare = computed(() => {
	return !props.playlist.restricted && props.playlist.playlist_id > -1;
});

const canDownload = computed(() => {
	return !props.playlist.restricted && (props.playlist.size > 0 || (props.playlist.list && props.playlist.list.length > 0));
});

const canDelete = computed(() => {
	return props.playlist.owner_id === vkStore.user_id || props.playlist.permissions?.delete;
});

const handleClickOutside = (event: MouseEvent) => {
	const target = event.target as HTMLElement;
	if (!target.closest(".playlist-header-more-actions")) {
		showActionsMenu.value = false;
	}
};

useEventListener(document, "click", handleClickOutside);

const playlistType = computed(() => {
	if (props.playlist.official) {
		return "Официальный плейлист";
	}
	if (props.playlist.owner_id && props.playlist.owner_id < 0) {
		return "Плейлист сообщества";
	}
	return "Плейлист";
});

const headerStyle = computed(() => {
	if (props.playlist.cover_url) {
		return {
			backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.6) 0%, var(--bg-primary, #121212) 100%), url(${props.playlist.cover_url})`,
			backgroundSize: "cover",
			backgroundPosition: "center"
		};
	}
	return {};
});

const formatListens = (listens: number): string => {
	if (listens >= 1000000) {
		return `${(listens / 1000000).toFixed(1)}M`;
	}
	if (listens >= 1000) {
		return `${(listens / 1000).toFixed(1)}K`;
	}
	return String(listens);
};

const handlePlayPause = async () => {
	emit("play", props.playlist);
	await handlePlayPauseBase();
};

const handleFollow = () => {
	emit("follow", props.playlist);
};

const handleEdit = () => {
	showActionsMenu.value = false;
	openCustom(EditPlaylistModal, {
		playlist: props.playlist
	});
};

const handleShare = () => {
	showActionsMenu.value = false;
	openCustom(SharePlaylistModal, {
		playlist: props.playlist
	});
};

const handleDownload = async () => {
	showActionsMenu.value = false;
	await downloadPlaylist(props.playlist).catch((error) => {
		console.error("Failed to download playlist:", error);
	});
};

const handleDelete = async () => {
	showActionsMenu.value = false;

	const confirmed = await openConfirm({
		message: `Вы уверены, что хотите удалить плейлист "${props.playlist.title}"?`,
		confirmText: "Удалить",
		cancelText: "Отмена"
	});

	if (!confirmed) {
		return;
	}

	const result = await deletePlaylist(props.playlist).catch((error) => {
		console.error("Failed to delete playlist:", error);
		return null;
	});

	if (result) {
		await vkStore.refreshPlaylists();
		await navigateTo("/general");
	}
};
</script>

<style scoped lang="scss">
.playlist-header-wrapper {
	position: relative;
	min-height: 240px;
}

.playlist-header-full {
	display: flex;
	gap: 24px;
	padding: 24px 32px;
	background: linear-gradient(180deg, rgba(0,0,0,0.6) 0%, var(--bg-primary, #121212) 100%);
	min-height: 240px;
	align-items: flex-end;
}

.playlist-header-cover {
	flex-shrink: 0;
	border-radius: 8px;
	overflow: hidden;
	box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
	width: 180px;
	height: 180px;
	align-self: flex-start;
	margin-top: 0;
	
	:deep(img),
	:deep(nuxt-img) {
		width: 100% !important;
		height: 100% !important;
		object-fit: cover;
		display: block;
		aspect-ratio: unset !important;
	}
}


.playlist-header-info {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 8px;
	padding-bottom: 8px;
}

.playlist-header-type {
	font-size: 14px;
	font-weight: 500;
	color: var(--text, #fff);
	text-transform: uppercase;
	letter-spacing: 1px;
}

.playlist-header-title {
	font-size: 48px;
	font-weight: 900;
	color: var(--text, #fff);
	margin: 0;
	line-height: 1.1;
	letter-spacing: -1px;
}

.playlist-header-description {
	font-size: 14px;
	color: var(--text-secondary, #b3b3b3);
	max-width: 600px;
	line-height: 1.5;
	word-wrap: break-word;
}

.playlist-header-meta {
	display: flex;
	align-items: center;
	gap: 8px;
	font-size: 14px;
	color: var(--text-secondary, #b3b3b3);
}

.playlist-header-author {
	font-weight: 600;
	color: var(--text, #fff);
	cursor: pointer;

	&:hover {
		text-decoration: underline;
	}
}

.playlist-header-size,
.playlist-header-listens {
	&::before {
		content: "•";
		margin: 0 8px;
	}
}

.playlist-header-actions {
	display: flex;
	align-items: center;
	gap: 16px;
	margin-top: 8px;
	position: relative;
}

.playlist-header-more-actions {
	position: relative;
}

.playlist-header-action-button {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 48px;
	height: 48px;
	background: transparent;
	border: 1px solid var(--border, #282828);
	border-radius: 50%;
	color: var(--text-secondary, #b3b3b3);
	cursor: pointer;
	transition: all 0.2s;

	&:hover {
		border-color: var(--text, #fff);
		color: var(--text, #fff);
		transform: scale(1.1);
	}
}

.actions-menu {
	position: absolute;
	top: calc(100% + 8px);
	right: 0;
	background: var(--bg-secondary, #181818);
	border: 1px solid var(--border, #282828);
	border-radius: 8px;
	padding: 8px;
	min-width: 200px;
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
	z-index: 100;
}

.actions-menu-item {
	display: flex;
	align-items: center;
	gap: 12px;
	width: 100%;
	padding: 12px 16px;
	background: transparent;
	border: none;
	border-radius: 6px;
	color: var(--text, #fff);
	font-size: 14px;
	cursor: pointer;
	transition: all 0.2s;
	text-align: left;

	&:hover {
		background: var(--bg-hover, #2a2a2a);
	}

	&.actions-menu-item-danger {
		color: var(--error, #ff4444);

		&:hover {
			background: rgba(255, 68, 68, 0.1);
		}
	}
}

.playlist-header-play-button {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 8px;
	padding: 14px 32px;
	background: var(--secondary, #e9003f);
	color: var(--text, #fff);
	border: none;
	border-radius: 50px;
	font-size: 14px;
	font-weight: 700;
	cursor: pointer;
	transition: all 0.2s;

	&:hover:not(:disabled) {
		background: var(--primary-hover, #ff1a5c);
		transform: scale(1.05);
	}

	&:active:not(:disabled) {
		transform: scale(0.98);
	}

	&:disabled {
		cursor: not-allowed;
		opacity: 0.7;
	}

	.loading-icon {
		animation: spin 1s linear infinite;
	}
}

@keyframes spin {
	from {
		transform: rotate(0deg);
	}
	to {
		transform: rotate(360deg);
	}
}

.playlist-header-follow-button {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 48px;
	height: 48px;
	background: transparent;
	border: 1px solid var(--border, #282828);
	border-radius: 50%;
	color: var(--text-secondary, #b3b3b3);
	cursor: pointer;
	transition: all 0.2s;

	&:hover {
		border-color: var(--text, #fff);
		color: var(--text, #fff);
		transform: scale(1.1);
	}

	&.active {
		border-color: var(--secondary, #e9003f);
		color: var(--secondary, #e9003f);
	}
}

@media (max-width: 1200px) {
	.playlist-header-wrapper {
		min-height: 200px;
	}

	.playlist-header-full {
		min-height: 200px;
		padding: 20px 24px;
		gap: 20px;
	}

	.playlist-header-cover {
		width: 150px;
		height: 150px;
		align-self: flex-start;
	}

	.playlist-header-title {
		font-size: 40px;
	}
}

@media (max-width: 1000px) {
	.playlist-header-wrapper {
		min-height: 180px;
	}

	.playlist-header-full {
		min-height: 180px;
		padding: 16px 20px;
		gap: 16px;
	}

	.playlist-header-cover {
		width: 120px;
		height: 120px;
		align-self: flex-start;
	}

	.playlist-header-title {
		font-size: 32px;
	}

	.playlist-header-type {
		font-size: 12px;
	}

	.playlist-header-description {
		font-size: 13px;
		max-width: 500px;
		word-wrap: break-word;
	}

	.playlist-header-meta {
		font-size: 13px;
	}

	.playlist-header-play-button {
		padding: 12px 24px;
		font-size: 13px;
	}

	.playlist-header-follow-button {
		width: 44px;
		height: 44px;
	}
}

@media (max-width: 800px) {
	.playlist-header-wrapper {
		min-height: 160px;
	}

	.playlist-header-full {
		min-height: 160px;
		padding: 12px 16px;
		gap: 12px;
	}

	.playlist-header-cover {
		width: 100px;
		height: 100px;
		align-self: flex-start;
	}

	.playlist-header-title {
		font-size: 28px;
	}

	.playlist-header-type {
		font-size: 11px;
	}

	.playlist-header-description {
		font-size: 12px;
		max-width: 400px;
		word-wrap: break-word;
	}

	.playlist-header-meta {
		font-size: 12px;
		flex-wrap: wrap;
		gap: 4px;
	}

	.playlist-header-size,
	.playlist-header-listens {
		&::before {
			margin: 0 4px;
		}
	}

	.playlist-header-actions {
		gap: 12px;
		margin-top: 4px;
	}

	.playlist-header-play-button {
		padding: 10px 20px;
		font-size: 12px;
		gap: 6px;

		:deep(svg) {
			width: 20px;
			height: 20px;
		}
	}

	.playlist-header-follow-button {
		width: 40px;
		height: 40px;

		:deep(svg) {
			width: 18px;
			height: 18px;
		}
	}
}

@media (max-width: 600px) {
	.playlist-header-wrapper {
		height: auto;
		min-height: 140px;
	}

	.playlist-header-full {
		flex-direction: column;
		align-items: center;
		height: auto;
		min-height: 140px;
		padding: 16px;
		gap: 16px;
	}

	.playlist-header-cover {
		width: 120px;
		height: 120px;
		align-self: center;
	}

	.playlist-header-info {
		width: 100%;
		text-align: center;
		align-items: center;
	}

	.playlist-header-title {
		font-size: 24px;
		text-align: center;
	}

	.playlist-header-type {
		font-size: 11px;
	}

	.playlist-header-description {
		text-align: center;
		max-width: 100%;
		word-wrap: break-word;
	}

	.playlist-header-meta {
		justify-content: center;
		font-size: 12px;
	}

	.playlist-header-actions {
		width: 100%;
		justify-content: center;
		margin-top: 8px;
	}

	.playlist-header-play-button {
		flex: 1;
		max-width: 200px;
	}

	.playlist-header-follow-button {
		width: 40px;
		height: 40px;
	}
}
</style>

