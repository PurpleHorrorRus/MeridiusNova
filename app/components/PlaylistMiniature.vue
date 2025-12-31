<template>
	<div class="playlist-miniature" :class="{ expanded: isExpanded }">
		<div class="playlist-miniature-header">
			<div class="playlist-miniature-main" @click="handleClick">
				<div class="playlist-miniature-cover">
					<Cover
						:src="playlist.cover_url"
						:width="40"
						:height="40"
					/>
				</div>
				<div class="playlist-miniature-info">
					<div class="playlist-miniature-title">{{ playlist.title }}</div>
					<div v-if="playlist.size !== undefined && playlist.size > 0" class="playlist-miniature-size">
						{{ playlist.size }} треков
					</div>
				</div>
			</div>
			<button class="playlist-miniature-toggle" @click.stop="toggleExpand">
				<Icon :name="isExpanded ? 'mdi:chevron-up' : 'mdi:chevron-down'" size="20" />
			</button>
		</div>

		<div v-if="isExpanded" class="playlist-miniature-tracks">
			<div v-if="loading" class="playlist-miniature-loading">
				<LoadingSpinner />
			</div>
			<div v-else-if="tracks.length > 0" class="playlist-miniature-tracks-list">
				<Song
					v-for="(audio, index) in tracks"
					:key="`miniature-${audio.owner_id}-${audio.id}-${index}`"
					:audio="audio"
				/>
			</div>
			<div v-else class="playlist-miniature-empty">
				Нет треков
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import type { TPlaylist } from "~~/server/utils/types";
import type { TAudio } from "~~/server/api/vk/audio/types";
import { usePlaylist } from "~/composables/usePlaylist";

const props = defineProps<{
	playlist: TPlaylist;
}>();

const isExpanded = ref(false);
const loading = ref(false);
const tracks = ref<TAudio[]>([]);

const { playPlaylist } = usePlaylist();

const handleClick = () => {
	navigateTo(`/playlist/${props.playlist.owner_id}/${props.playlist.playlist_id}`);
};

const toggleExpand = async (event: Event) => {
	event.stopPropagation();
	if (!isExpanded.value && tracks.value.length === 0) {
		loading.value = true;
		const result = await $fetch<{ audios: TAudio[] }>(
			`/api/vk/audio/${props.playlist.owner_id}/${props.playlist.playlist_id}`,
			{
				params: props.playlist.access_hash ? { access_hash: props.playlist.access_hash } : {}
			}
		).catch((error: Error) => {
			console.error("Failed to load playlist tracks:", error);
			return null;
		});

		if (result && result.audios && Array.isArray(result.audios)) {
			tracks.value = result.audios;
		} else {
			console.warn("No tracks found or invalid response format:", result);
		}

		loading.value = false;
	}
	isExpanded.value = !isExpanded.value;
};
</script>

<style scoped lang="scss">
.playlist-miniature {
	background: var(--bg-secondary, #282828);
	border-radius: 4px;
	margin-bottom: 4px;
	overflow: hidden;
	transition: all 0.3s ease;

	&-header {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 12px;
		transition: background 0.2s ease;
	}

	&-main {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 8px;
		cursor: pointer;
		min-width: 0;

		&:hover {
			.playlist-miniature-title {
				color: var(--text, #fff);
			}
		}
	}

	&-cover {
		flex-shrink: 0;
		width: 40px;
		height: 40px;
		border-radius: 4px;
		overflow: hidden;
	}

	&-info {
		flex: 1;
		min-width: 0;
	}

	&-title {
		font-size: 13px;
		font-weight: 500;
		color: var(--text-secondary, #b3b3b3);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		margin-bottom: 2px;
		transition: color 0.2s ease;
	}

	&-size {
		font-size: 11px;
		color: var(--text-tertiary, #6b6b6b);
	}

	&-toggle {
		flex-shrink: 0;
		background: none;
		border: none;
		color: var(--text-secondary, #b3b3b3);
		cursor: pointer;
		padding: 4px;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: color 0.2s ease;

		&:hover {
			color: var(--text, #fff);
		}
	}

	&-tracks {
		border-top: 1px solid var(--border, #3a3a3a);
		max-height: 400px;
		overflow-y: auto;
	}

	&-loading,
	&-empty {
		padding: 20px;
		text-align: center;
		color: var(--text-secondary, #b3b3b3);
		font-size: 14px;
	}

	&-tracks-list {
		.song {
			border-radius: 0;
			&:not(:last-child) {
				border-bottom: 1px solid var(--border, #3a3a3a);
			}
		}
	}
}
</style>

