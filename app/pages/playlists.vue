<template>
	<div class="page" id="playlists-page">
		<div v-if="loading" class="loading">
			<LoadingSpinner />
		</div>

		<div v-else-if="error" class="error">
			{{ error }}
		</div>

		<div v-else-if="playlistsData" class="content">
			<div class="page-header">
				<div class="page-header-content">
					<h1 class="page-title">Моя музыка</h1>
					<p v-if="playlists.length > 0" class="page-subtitle">
						{{ playlists.length }} {{ playlists.length === 1 ? 'плейлист' : playlists.length < 5 ? 'плейлиста' : 'плейлистов' }}
					</p>
				</div>
				<button class="create-playlist-button" @click="handleCreatePlaylist">
					<Icon name="mdi:plus" size="20" />
					<span>Создать плейлист</span>
				</button>
			</div>

			<div v-if="playlists.length > 0" class="playlists-grid">
				<PlaylistCard
					v-for="playlist in playlists"
					:key="playlist.raw_id"
					:playlist="playlist"
					:show-play-button="true"
				/>
			</div>

			<div v-else class="empty-state">
				<div class="empty-state-content">
					<Icon name="mdi:music-box-outline" size="64" />
					<h2 class="empty-state-title">Нет плейлистов</h2>
					<p class="empty-state-description">Создайте свой первый плейлист, чтобы начать</p>
				</div>
			</div>

			<div v-if="hasMore" class="load-more" ref="loadMoreRef">
				<button @click="loadMore" :disabled="loadingMore" class="load-more-button">
					<Icon v-if="loadingMore" name="mdi:loading" size="20" class="loading-icon" />
					<span v-else>Загрузить еще</span>
				</button>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { useVkStore } from "~/stores/vk";
import { useModal } from "~/composables/useModal";
import CreatePlaylistModal from "~/components/Modals/CreatePlaylistModal.vue";
import type { TPlaylist } from "~~/server/utils/types";

const vkStore = useVkStore();
const { openCustom } = useModal();
const userId = computed(() => vkStore.user_id || 0);

const { data: playlistsData, pending: loading, error, refresh } = await useAsyncData<{
	count: number;
	playlists: TPlaylist[];
}>(
	"my-playlists",
	async () => {
		if (!userId.value) {
			return { count: 0, playlists: [] };
		}

		return await $fetch(`/api/vk/playlists`, {
			params: {
				owner_id: userId.value
			}
		});
	},
	{
		watch: [userId]
	}
);

const playlists = computed(() => playlistsData.value?.playlists || []);
const hasMore = computed(() => {
	return playlistsData.value && playlists.value.length < playlistsData.value.count;
});

const loadingMore = ref(false);
const offset = ref(0);
const loadMoreRef = ref<HTMLElement | null>(null);

const loadMore = async () => {
	if (loadingMore.value || !hasMore.value) {
		return;
	}

	loadingMore.value = true;
	offset.value += 50;

		const more = await $fetch<{ count: number; playlists: TPlaylist[] }>(`api/vk/playlists`, {
			params: {
				owner_id: userId.value,
				offset: offset.value
			}
	}).catch((error: Error) => {
		console.error("Failed to load more playlists", error);
		return null;
	});

	if (more && playlistsData.value) {
		playlistsData.value.playlists.push(...more.playlists);
	}

		loadingMore.value = false;
};

watch(() => vkStore.authenticated, (authenticated) => {
	if (authenticated) {
		refresh();
	}
});

const handleCreatePlaylist = () => {
	openCustom(CreatePlaylistModal, {}, {
		onConfirm: async () => {
			await refresh();
		}
	});
};
</script>

<style scoped lang="scss">
.page {
	padding: 24px 32px;
	min-height: 100%;
}

.loading,
.error {
	text-align: center;
	padding: 60px 40px;
	color: var(--text-secondary, #b3b3b3);
}

.content {
	display: flex;
	flex-direction: column;
	gap: 32px;
}

.page-header {
	margin-bottom: 8px;
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	gap: 16px;
}

.page-header-content {
	display: flex;
	flex-direction: column;
	gap: 8px;
	flex: 1;
}

.create-playlist-button {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 12px 24px;
	background: var(--secondary, #e9003f);
	color: var(--text, #fff);
	border: none;
	border-radius: 8px;
	font-size: 14px;
	font-weight: 600;
	cursor: pointer;
	transition: all 0.2s;
	white-space: nowrap;

	&:hover {
		background: var(--primary-hover, #ff1a5c);
		transform: translateY(-1px);
	}

	&:active {
		transform: translateY(0);
	}
}

.page-title {
	font-size: 36px;
	font-weight: 700;
	margin: 0;
	color: var(--text, #ffffff);
	letter-spacing: -0.5px;
}

.page-subtitle {
	font-size: 14px;
	color: var(--text-secondary, #b3b3b3);
	margin: 0;
	font-weight: 400;
}

.playlists-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
	gap: 24px;

	@media (max-width: 1024px) {
		grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
		gap: 20px;
	}

	@media (max-width: 768px) {
		grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
		gap: 16px;
	}

	@media (max-width: 480px) {
		grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
		gap: 12px;
	}
}

.empty-state {
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: 400px;
	padding: 60px 20px;
}

.empty-state-content {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 16px;
	text-align: center;
	max-width: 400px;
}

.empty-state-content :deep(svg) {
	color: var(--text-tertiary, #6b6b6b);
	opacity: 0.6;
}

.empty-state-title {
	font-size: 24px;
	font-weight: 600;
	margin: 0;
	color: var(--text, #ffffff);
}

.empty-state-description {
	font-size: 14px;
	color: var(--text-secondary, #b3b3b3);
	margin: 0;
	line-height: 1.5;
}

.load-more {
	display: flex;
	justify-content: center;
	align-items: center;
	padding: 32px 20px;
}

.load-more-button {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 8px;
	padding: 12px 24px;
	background: var(--bg-secondary, #181818);
	color: var(--text, #ffffff);
	border: 1px solid var(--border, #282828);
	border-radius: 8px;
	cursor: pointer;
	font-size: 14px;
	font-weight: 500;
	transition: all 0.2s ease;
	min-width: 140px;

	&:hover:not(:disabled) {
		background: var(--bg-hover, #2a2a2a);
		border-color: var(--border-secondary, #2a2a2a);
		transform: translateY(-1px);
	}

	&:active:not(:disabled) {
		transform: translateY(0);
	}

	&:disabled {
		opacity: 0.6;
		cursor: not-allowed;
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
