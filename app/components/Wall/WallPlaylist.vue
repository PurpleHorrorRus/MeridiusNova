<template>
	<div class="wall-playlist">
		<div class="wall-playlist-header">
			<Cover
				class="wall-playlist-cover"
				:src="playlist.cover_url"
				:width="120"
				:height="120"
			/>

			<div class="wall-playlist-info">
				<NuxtLink class="wall-playlist-title" :to="playlistLink">
					{{ playlist.title }}
				</NuxtLink>

				<div v-if="playlist.description" class="wall-playlist-description">
					{{ truncatedDescription }}
				</div>

				<div v-if="playlist.size !== undefined && playlist.size > 0" class="wall-playlist-meta">
					{{ playlist.size }} {{ getString("playlist.tracks") }}
				</div>
			</div>
		</div>

		<div class="wall-playlist-tracks">
			<Song
				v-for="(audio, index) in displayedAudios"
				:key="`wall-playlist-${audio.full_id || audio.id}-${index}`"
				:audio="audio"
				:index="index"
			/>

			<NuxtLink v-if="moreCount > 0" :to="playlistLink" class="wall-playlist-more">
				{{ getString("wall.remains", { count: moreCount }) }}
			</NuxtLink>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { TPlaylist } from "~~/server/utils/types";
import type { TAudio } from "~~/server/api/vk/audio/types";
import Song from "~/components/Song/Song.vue";
import Cover from "~/components/Cover.vue";

const props = defineProps<{
	playlist: TPlaylist & {
		list?: TAudio[];
	};
}>();

const { getString } = useStrings();

const truncatedDescription = computed(() => {
	if (!props.playlist.description) {
		return "";
	}
	return props.playlist.description.length > 300
		? props.playlist.description.substring(0, 300) + "..."
		: props.playlist.description;
});

const playlistLink = computed(() => {
	const query = new URLSearchParams();
	if (props.playlist.access_hash) {
		query.set("access_hash", props.playlist.access_hash);
	}
	const queryString = query.toString();
	return `/playlist/${props.playlist.owner_id}/${props.playlist.playlist_id}${queryString ? `?${queryString}` : ""}`;
});

const displayedAudios = computed(() => {
	return props.playlist.list?.slice(0, 5) || [];
});

const moreCount = computed(() => {
	const total = props.playlist.size || 0;
	const displayed = displayedAudios.value.length;
	return Math.max(0, total - displayed);
});
</script>

<style scoped lang="scss">
.wall-playlist {
	display: flex;
	flex-direction: column;
	gap: 16px;
	padding: 0;
	background: transparent;
	border: none;
	user-select: text;
	-webkit-user-select: text;
	-moz-user-select: text;
	-ms-user-select: text;
}

.wall-playlist-header {
	display: flex;
	gap: 16px;
	align-items: flex-start;
}

.wall-playlist-cover {
	flex-shrink: 0;
	width: 120px;
	height: 120px;
	border-radius: 8px;
	overflow: hidden;
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.wall-playlist-info {
	display: flex;
	flex-direction: column;
	gap: 8px;
	flex: 1;
	min-width: 0;
}

.wall-playlist-title {
	font-size: 18px;
	font-weight: 600;
	color: var(--text, #fff);
	text-decoration: none;
	transition: color 0.2s;
	line-height: 1.3;
	word-wrap: break-word;

	&:hover {
		color: var(--secondary, #e9003f);
	}
}

.wall-playlist-description {
	font-size: 13px;
	color: var(--text-secondary, #b3b3b3);
	line-height: 1.5;
	word-wrap: break-word;
	white-space: pre-wrap;
}

.wall-playlist-meta {
	font-size: 12px;
	color: var(--text-tertiary, #6b6b6b);
	margin-top: 4px;
}

.wall-playlist-tracks {
	display: flex;
	flex-direction: column;
	gap: 0;
	background: var(--bg-tertiary, #0f0f0f);
	border-radius: 12px;
	overflow: hidden;
	border: 1px solid var(--border, #2a2a2a);
	margin-top: 8px;

	.song {
		border-radius: 0;
		border-bottom: 1px solid var(--border, #2a2a2a);

		&:last-child {
			border-bottom: none;
		}
	}
}

.wall-playlist-more {
	padding: 12px 16px;
	font-size: 13px;
	color: var(--secondary, #e9003f);
	text-decoration: none;
	text-align: center;
	transition: all 0.2s;
	border-top: 1px solid var(--border, #2a2a2a);
	background: var(--bg-secondary, #181818);

	&:hover {
		background: var(--bg-hover, #1f1f1f);
		color: var(--secondary-hover, #ff1a5c);
	}
}

@media (max-width: 768px) {
	.wall-playlist {
		padding: 12px;
		gap: 12px;
	}

	.wall-playlist-header {
		gap: 12px;
	}

	.wall-playlist-cover {
		width: 100px;
		height: 100px;
	}

	.wall-playlist-title {
		font-size: 16px;
	}

	.wall-playlist-description {
		font-size: 12px;
	}
}

@media (max-width: 480px) {
	.wall-playlist-header {
		flex-direction: column;
		align-items: center;
		text-align: center;
	}

	.wall-playlist-cover {
		width: 120px;
		height: 120px;
	}

	.wall-playlist-info {
		align-items: center;
		text-align: center;
	}
}
</style>
