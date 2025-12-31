<template>
	<div v-if="show" class="playlist-select-overlay" @click.self="close">
		<div class="playlist-select" @click.stop>
			<div class="playlist-select-header">
				<h3>Выберите плейлист</h3>
				<button class="close-button" @click="close">
					<Icon name="mdi:close" size="20" />
				</button>
			</div>
			<div class="playlist-select-content">
				<div
					v-for="playlist in playlists"
					:key="playlist.raw_id"
					class="playlist-item"
					@click="selectPlaylist(playlist)"
				>
					{{ playlist.title }}
				</div>
				<div v-if="playlists.length === 0" class="no-playlists">
					Нет плейлистов
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import type { TPlaylist } from "~~/server/utils/types";

const props = defineProps<{
	show: boolean;
}>();

const emit = defineEmits<{
	close: [];
	select: [playlist: TPlaylist];
}>();

const playlists = ref<TPlaylist[]>([]);
const isLoading = ref(false);
const hasLoaded = ref(false);

const close = () => {
	emit("close");
};

const selectPlaylist = (playlist: TPlaylist) => {
	emit("select", playlist);
	close();
};

const loadPlaylists = async () => {
	if (hasLoaded.value || isLoading.value) {
		return;
	}

	isLoading.value = true;

	const data = await $fetch<{ playlists: TPlaylist[] }>("/api/vk/playlists").catch(() => ({ playlists: [] }));

	playlists.value = data.playlists || [];
	hasLoaded.value = true;
	isLoading.value = false;
};

watch(() => props.show, (newShow) => {
	if (newShow && !hasLoaded.value) {
		loadPlaylists();
	}
});
</script>

<style scoped lang="scss">
.playlist-select-overlay {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.6);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 2000;
}

.playlist-select {
	background: var(--bg-secondary, #181818);
	border-radius: 12px;
	width: 400px;
	max-height: 500px;
	display: flex;
	flex-direction: column;
	overflow: hidden;
}

.playlist-select-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 16px 20px;
	border-bottom: 1px solid var(--border, #282828);

	h3 {
		margin: 0;
		font-size: 18px;
		font-weight: 600;
		color: var(--text, #fff);
	}
}

.close-button {
	background: none;
	border: none;
	color: var(--text-secondary, #b3b3b3);
	cursor: pointer;
	padding: 4px;
	border-radius: 4px;
	transition: all 0.2s;

	&:hover {
		background: var(--bg-hover, #2a2a2a);
		color: var(--text, #fff);
	}
}

.playlist-select-content {
	flex: 1;
	overflow-y: auto;
	padding: 8px;
}

.playlist-item {
	padding: 12px 16px;
	border-radius: 8px;
	cursor: pointer;
	transition: all 0.2s;
	color: var(--text, #fff);
	font-size: 14px;

	&:hover {
		background: var(--bg-hover, #2a2a2a);
	}
}

.no-playlists {
	padding: 24px;
	text-align: center;
	color: var(--text-secondary, #b3b3b3);
	font-size: 14px;
}
</style>

