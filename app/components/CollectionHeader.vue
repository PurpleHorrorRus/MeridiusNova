<template>
	<div class="collection-header-wrapper" :style="headerStyle">
		<div class="collection-header-full">
			<div class="collection-header-avatar">
				<Cover
					:src="user.photo_200 || user.photo_max || user.avatar || ''"
					:width="180"
					:height="180"
				/>
			</div>

			<div class="collection-header-info">
				<div class="collection-header-type">{{ getString("collection.type") }}</div>
				<h1 class="collection-header-title">{{ userName }}</h1>

				<div class="collection-header-meta">
					<span v-if="playlist.size !== undefined && playlist.size > 0" class="collection-header-size">
						{{ playlist.size }} {{ getString("playlist.tracks") }}
					</span>
				</div>

				<div v-if="!isRestricted" class="collection-header-actions">
					<button @click="handlePlayPause" class="collection-header-play-button" :disabled="isLoading">
						<Icon :name="isLoading ? 'mdi:loading' : (isPlaying ? 'mdi:pause' : 'mdi:play')" size="24" :class="{ 'loading-icon': isLoading }" />
						<span>{{ isLoading ? getString("general.loading") : (isPlaying ? getString("player.pause") : getString("player.play")) }}</span>
					</button>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { TPlaylist } from "~~/server/utils/types";
import { usePlaylistButton } from "~/composables/usePlaylistButton";

const props = defineProps<{
	playlist: TPlaylist;
	user: {
		id: number;
		first_name: string;
		last_name: string;
		photo_200?: string;
		photo_max?: string;
		avatar?: string;
	};
}>();

const emit = defineEmits<{
	play: [playlist: TPlaylist];
}>();

const { getString, translate } = useStrings();
const { isPlaying, isLoading, handlePlayPause: handlePlayPauseBase } = usePlaylistButton(props.playlist);

const isRestricted = computed(() => {
	return Boolean(props.playlist.restricted);
});

const userName = computed(() => {
	const name = `${props.user.first_name} ${props.user.last_name}`.trim();
	if (name) {
		return name;
	}
	return translate("collection.user", { id: props.user.id.toString() });
});

const headerStyle = computed(() => {
	const photo = props.user.photo_200 || props.user.photo_max || props.user.avatar;
	if (photo) {
		return {
			backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.6) 0%, var(--bg-primary, #121212) 100%), url(${photo})`,
			backgroundSize: "cover",
			backgroundPosition: "center"
		};
	}
	return {};
});

const handlePlayPause = async () => {
	emit("play", props.playlist);
	await handlePlayPauseBase();
};
</script>

<style scoped lang="scss">
.collection-header-wrapper {
	position: relative;
	min-height: 240px;
}

.collection-header-full {
	display: flex;
	gap: 24px;
	padding: 24px 32px;
	background: linear-gradient(180deg, rgba(0,0,0,0.6) 0%, var(--bg-primary, #121212) 100%);
	min-height: 240px;
	align-items: flex-end;
}

.collection-header-avatar {
	flex-shrink: 0;
	border-radius: 50%;
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

.collection-header-info {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 8px;
	padding-bottom: 8px;
}

.collection-header-type {
	font-size: 14px;
	font-weight: 500;
	color: var(--text, #fff);
	text-transform: uppercase;
	letter-spacing: 1px;
}

.collection-header-title {
	font-size: 48px;
	font-weight: 900;
	color: var(--text, #fff);
	margin: 0;
	line-height: 1.1;
	letter-spacing: -1px;
}

.collection-header-meta {
	display: flex;
	align-items: center;
	gap: 8px;
	font-size: 14px;
	color: var(--text-secondary, #b3b3b3);
}

.collection-header-size {
	&::before {
		content: "•";
		margin: 0 8px;
	}
}

.collection-header-actions {
	display: flex;
	align-items: center;
	gap: 16px;
	margin-top: 8px;
}

.collection-header-play-button {
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

@media (max-width: 1200px) {
	.collection-header-wrapper {
		min-height: 200px;
	}

	.collection-header-full {
		min-height: 200px;
		padding: 20px 24px;
		gap: 20px;
	}

	.collection-header-avatar {
		width: 150px;
		height: 150px;
		align-self: flex-start;
	}

	.collection-header-title {
		font-size: 40px;
	}
}

@media (max-width: 1000px) {
	.collection-header-wrapper {
		min-height: 180px;
	}

	.collection-header-full {
		min-height: 180px;
		padding: 16px 20px;
		gap: 16px;
	}

	.collection-header-avatar {
		width: 120px;
		height: 120px;
		align-self: flex-start;
	}

	.collection-header-title {
		font-size: 32px;
	}

	.collection-header-type {
		font-size: 12px;
	}

	.collection-header-meta {
		font-size: 13px;
	}

	.collection-header-play-button {
		padding: 12px 24px;
		font-size: 13px;
	}
}

@media (max-width: 800px) {
	.collection-header-wrapper {
		min-height: 160px;
	}

	.collection-header-full {
		min-height: 160px;
		padding: 12px 16px;
		gap: 12px;
	}

	.collection-header-avatar {
		width: 100px;
		height: 100px;
		align-self: flex-start;
	}

	.collection-header-title {
		font-size: 28px;
	}

	.collection-header-type {
		font-size: 11px;
	}

	.collection-header-meta {
		font-size: 12px;
		flex-wrap: wrap;
		gap: 4px;
	}

	.collection-header-size {
		&::before {
			margin: 0 4px;
		}
	}

	.collection-header-actions {
		gap: 12px;
		margin-top: 4px;
	}

	.collection-header-play-button {
		padding: 10px 20px;
		font-size: 12px;
		gap: 6px;

		:deep(svg) {
			width: 20px;
			height: 20px;
		}
	}
}

@media (max-width: 600px) {
	.collection-header-wrapper {
		height: auto;
		min-height: 140px;
	}

	.collection-header-full {
		flex-direction: column;
		align-items: center;
		height: auto;
		min-height: 140px;
		padding: 16px;
		gap: 16px;
	}

	.collection-header-avatar {
		width: 120px;
		height: 120px;
		align-self: center;
	}

	.collection-header-info {
		width: 100%;
		text-align: center;
		align-items: center;
	}

	.collection-header-title {
		font-size: 24px;
		text-align: center;
	}

	.collection-header-type {
		font-size: 11px;
	}

	.collection-header-meta {
		justify-content: center;
		font-size: 12px;
	}

	.collection-header-actions {
		width: 100%;
		justify-content: center;
		margin-top: 8px;
	}

	.collection-header-play-button {
		flex: 1;
		max-width: 200px;
	}
}
</style>

