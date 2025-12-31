<template>
	<div
		v-if="show"
		class="context-menu-overlay"
		@click="close"
		@contextmenu.prevent
	>
		<div
			class="context-menu"
			:style="menuStyle"
			@click.stop
		>
			<button
				v-if="songProps.canAddPlaylist"
				class="context-menu-item context-menu-item-with-submenu"
				@mouseenter="handlePlaylistMenuEnter"
				@mouseleave="handlePlaylistMenuLeave"
			>
				<Icon name="mdi:playlist-plus" size="18" />
				<span>Добавить в плейлист</span>
				<Icon name="mdi:chevron-right" size="16" class="submenu-arrow" />
			</button>

			<button
				v-if="songProps.canAdd"
				class="context-menu-item"
				@click="handleAdd"
			>
				<Icon name="mdi:plus" size="18" />
				<span>Добавить в библиотеку</span>
			</button>

			<button
				v-if="songProps.canDelete"
				class="context-menu-item"
				@click="handleDelete"
			>
				<Icon name="mdi:delete" size="18" />
				<span>{{ deleteLabel }}</span>
			</button>

			<div v-if="songProps.canDelete && currentPlaylist" class="context-menu-divider"></div>

			<button
				v-if="songProps.canDelete && currentPlaylist"
				class="context-menu-item"
				@click="handleRemoveFromPlaylist"
			>
				<Icon name="mdi:playlist-remove" size="18" />
				<span>Удалить из плейлиста</span>
			</button>

			<div class="context-menu-divider"></div>

			<button
				v-if="songProps.canEdit"
				class="context-menu-item"
				@click="handleEdit"
			>
				<Icon name="mdi:pencil" size="18" />
				<span>Редактировать</span>
			</button>

			<button
				v-if="songProps.hasLyrics"
				class="context-menu-item"
				@click="handleLyrics"
			>
				<Icon name="mdi:text" size="18" />
				<span>Текст песни</span>
			</button>

			<button
				v-if="songProps.canDownload"
				class="context-menu-item"
				@click="handleDownload"
			>
				<Icon name="mdi:download" size="18" />
				<span>Скачать</span>
			</button>

			<button
				v-if="songProps.canShare"
				class="context-menu-item"
				@click="handleShare"
			>
				<Icon name="mdi:share" size="18" />
				<span>Поделиться</span>
			</button>

			<button
				class="context-menu-item"
				@click="handleSimilar"
			>
				<Icon name="mdi:music-note" size="18" />
				<span>Найти похожее</span>
			</button>

			<div
				v-if="showPlaylistSubmenu"
				class="context-submenu"
				:style="submenuStyle"
				@mouseenter="handlePlaylistMenuEnter"
				@mouseleave="handlePlaylistMenuLeave"
			>
				<button
					v-for="playlist in myPlaylists"
					:key="playlist.raw_id"
					class="context-menu-item context-menu-item-with-cover"
					@click="handleSelectPlaylist(playlist)"
				>
					<Cover
						:src="playlist.cover_url"
						:width="32"
						:height="32"
						class="playlist-submenu-cover"
					/>
					<span>{{ playlist.title }}</span>
				</button>
				<div v-if="myPlaylists.length === 0" class="context-menu-item context-menu-item-disabled">
					<span>Нет плейлистов</span>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import type { TAudio, TPlaylist } from "~~/server/utils/types";
import { useAudioActions } from "~/composables/useAudioActions";
import { useSongProps } from "~/composables/useSongProps";
import { usePlaylist } from "~/composables/usePlaylist";
import { useModal } from "~/composables/useModal";
import { useVkStore } from "~/stores/vk";
import { usePlaylistStore } from "~/stores/playlist";
import Cover from "~/components/Cover.vue";

const props = defineProps<{
	show: boolean;
	audio: TAudio | null;
	position?: { x: number; y: number };
}>();

const emit = defineEmits<{
	close: [];
}>();

const { addAudio, deleteAudio, addSongToPlaylist, removeSongFromPlaylist, downloadAudio, shareAudio, getSimilarTracks } = useAudioActions();
const { generateSongProps } = useSongProps();
const { current, playing } = usePlaylist();
const { openModal } = useModal();
const vkStore = useVkStore();
const playlistStore = usePlaylistStore();

const showPlaylistSubmenu = ref(false);
const menuStyle = ref<{ left?: string; top?: string }>({});
const submenuStyle = ref<{ left?: string; top?: string }>({});
const playlists = ref<TPlaylist[]>([]);
const playlistMenuTimeout = ref<NodeJS.Timeout | null>(null);

const songProps = computed(() => {
	const defaultProps = {
		canAdd: false,
		canDelete: false,
		canAddPlaylist: false,
		canEdit: false,
		canShare: false,
		hasLyrics: false,
		canDownload: false,
		isRestricted: false
	};

	if (!props.audio) {
		return defaultProps;
	}

	return {
		...defaultProps,
		...generateSongProps(props.audio)
	};
});

const currentPlaylist = computed(() => {
	return playing.value || current.value;
});

const deleteLabel = computed(() => {
	const playlist = currentPlaylist.value;
	
	// Определяем, удаляем из плейлиста или из библиотеки
	// Логика как в старом проекте: если playlist_id >= 0 и нет addedSong - удаляем из плейлиста
	const shouldRemoveFromPlaylist = playlist 
		&& playlist.playlist_id >= 0 
		&& !(props.audio as any)?.addedSong;
	
	return shouldRemoveFromPlaylist ? "Удалить из плейлиста" : "Удалить из библиотеки";
});

const myPlaylists = computed(() => {
	return playlists.value.filter(playlist => {
		return playlist.owner_id === vkStore.user_id
			&& playlist.playlist_id !== -1
			&& playlist.raw_id !== currentPlaylist.value?.raw_id;
	});
});

const close = () => {
	emit("close");
};

const handleAdd = async () => {
	if (!props.audio) {
		return;
	}

	await addAudio(props.audio).catch(console.error);
	close();
};

const handleDelete = async () => {
	if (!props.audio) {
		return;
	}

	const playlist = currentPlaylist.value;
	
	// Определяем, удаляем из плейлиста или из библиотеки
	// Логика как в старом проекте: если playlist_id >= 0 и нет addedSong - удаляем из плейлиста
	const shouldRemoveFromPlaylist = playlist 
		&& playlist.playlist_id >= 0 
		&& !(props.audio as any).addedSong;
	
	let result;
	
	if (shouldRemoveFromPlaylist) {
		// Удаляем из плейлиста
		result = await removeSongFromPlaylist(props.audio, playlist).catch(console.error);
		
		if (result?.success) {
			// Обновляем размер плейлиста
			if (playlist.size !== undefined) {
				playlist.size = Math.max(0, (playlist.size || 0) - 1);
			}
		}
	} else {
		// Удаляем из библиотеки
		result = await deleteAudio(props.audio).catch(console.error);
	}
	
	if (result?.success) {
		// Обновляем состояние: удаляем трек из плейлистов и очереди
		playlistStore.removeSongByFullId(props.audio.full_id);
		
		// Если удаленный трек был текущим, переключаемся на следующий
		const currentSong = playlistStore.currentSong;
		if (currentSong && currentSong.full_id === props.audio.full_id) {
			playlistStore.next();
		}
	}
	
	close();
};

const handlePlaylistMenuEnter = () => {
	if (playlistMenuTimeout.value) {
		clearTimeout(playlistMenuTimeout.value);
		playlistMenuTimeout.value = null;
	}

	if (playlists.value.length === 0) {
		loadPlaylists();
	}

	showPlaylistSubmenu.value = true;
	updateSubmenuPosition();
};

const handlePlaylistMenuLeave = () => {
	playlistMenuTimeout.value = setTimeout(() => {
		showPlaylistSubmenu.value = false;
	}, 200);
};

const loadPlaylists = async () => {
	if (playlists.value.length > 0) {
		return;
	}

	const data = await $fetch<{ playlists: TPlaylist[] }>("/api/vk/playlists", {
		params: {
			owner_id: vkStore.user_id
		}
	}).catch(() => ({ playlists: [] }));

	playlists.value = data.playlists || [];
};

const handleSelectPlaylist = async (playlist: TPlaylist) => {
	if (!props.audio) {
		return;
	}

	await addSongToPlaylist(props.audio, playlist).catch(console.error);
	showPlaylistSubmenu.value = false;
	close();
};

const handleEdit = () => {
	if (!props.audio) {
		return;
	}

	openModal("editTrack", { audio: props.audio });
	close();
};

const handleLyrics = () => {
	if (!props.audio) {
		return;
	}

	openModal("lyrics", { audio: props.audio });
	close();
};

const handleDownload = async () => {
	if (!props.audio) {
		return;
	}

	await downloadAudio(props.audio).catch(console.error);
	close();
};

const handleShare = () => {
	if (!props.audio) {
		return;
	}

	openModal("shareAudio", { audio: props.audio });
	close();
};

const handleSimilar = async () => {
	if (!props.audio) {
		return;
	}

	const result = await getSimilarTracks(props.audio).catch(() => null);
	if (result) {
		navigateTo(`/songs/${props.audio.id}?audio_owner_id=${props.audio.owner_id}`);
	}
	close();
};

const handleRemoveFromPlaylist = async () => {
	if (!props.audio || !currentPlaylist.value) {
		return;
	}

	const result = await removeSongFromPlaylist(props.audio, currentPlaylist.value).catch(console.error);
	
	if (result?.success) {
		// Обновляем состояние: удаляем трек из плейлиста и очереди
		playlistStore.removeSongByFullId(props.audio.full_id);
		
		// Если удаленный трек был текущим, переключаемся на следующий
		const currentSong = playlistStore.currentSong;
		if (currentSong && currentSong.full_id === props.audio.full_id) {
			playlistStore.next();
		}
		
		// Обновляем размер плейлиста
		if (currentPlaylist.value.size !== undefined) {
			currentPlaylist.value.size = Math.max(0, (currentPlaylist.value.size || 0) - 1);
		}
	}
	
	close();
};

const updatePosition = () => {
	if (!props.position) {
		return;
	}

	const menuWidth = 240;
	const menuHeight = 300;
	const padding = 8;

	let left = props.position.x;
	let top = props.position.y;

	// Проверяем, помещается ли меню справа
	if (left + menuWidth > window.innerWidth) {
		left = window.innerWidth - menuWidth - padding;
	}

	// Проверяем, помещается ли меню слева
	if (left < padding) {
		left = padding;
	}

	// Всегда пытаемся открыть снизу от точки клика
	// Если меню выходит за нижнюю границу, ограничиваем позицию
	if (top + menuHeight > window.innerHeight - padding) {
		const maxTop = window.innerHeight - menuHeight - padding;
		
		// Если точка клика ниже maxTop, используем точку клика (меню будет частично видно)
		// Если точка клика выше maxTop, ограничиваем до maxTop
		// Только если maxTop отрицательный или слишком маленький, открываем сверху
		if (maxTop < padding) {
			// Меню полностью не помещается снизу, открываем сверху
			top = props.position.y - menuHeight;
		} else if (props.position.y <= maxTop) {
			// Точка клика ниже или равна maxTop, используем точку клика (меню будет частично видно снизу)
			// top уже равен props.position.y, ничего не меняем
		} else {
			// Точка клика выше maxTop, ограничиваем до maxTop
			top = maxTop;
		}
	}
	
	// Финальная проверка границ
	if (top < padding) {
		top = padding;
	}
	
	if (top + menuHeight > window.innerHeight - padding) {
		top = window.innerHeight - menuHeight - padding;
	}

	menuStyle.value = {
		left: `${left}px`,
		top: `${top}px`
	};
};

const updateSubmenuPosition = () => {
	if (!props.position) {
		return;
	}

	const menuWidth = 240;
	const submenuWidth = 200;
	const submenuHeight = 400;
	const padding = 8;

	let left = props.position.x + menuWidth;
	let top = props.position.y;

	// Проверяем, помещается ли подменю справа
	if (left + submenuWidth > window.innerWidth) {
		// Открываем слева от основного меню
		left = props.position.x - submenuWidth;
	}

	// Проверяем, помещается ли подменю слева
	if (left < padding) {
		left = padding;
	}

	// Всегда пытаемся открыть снизу от точки клика
	// Если подменю выходит за нижнюю границу, ограничиваем только если это необходимо
	if (top + submenuHeight > window.innerHeight - padding) {
		const maxTop = window.innerHeight - submenuHeight - padding;
		
		// Если ограниченная позиция все еще ниже или на уровне точки клика,
		// используем ограниченную позицию (подменю будет частично видно)
		// Иначе открываем сверху от точки клика
		if (maxTop >= props.position.y) {
			top = maxTop;
		} else {
			// Подменю полностью не помещается снизу, открываем сверху
			top = props.position.y - submenuHeight;
		}
	}
	
	// Финальная проверка границ
	if (top < padding) {
		top = padding;
	}
	
	if (top + submenuHeight > window.innerHeight - padding) {
		top = window.innerHeight - submenuHeight - padding;
	}

	submenuStyle.value = {
		left: `${left}px`,
		top: `${top}px`
	};
};

watch(() => props.show, (newShow) => {
	if (newShow) {
		updatePosition();
	} else {
		showPlaylistSubmenu.value = false;
		if (playlistMenuTimeout.value) {
			clearTimeout(playlistMenuTimeout.value);
			playlistMenuTimeout.value = null;
		}
	}
});

watch(() => props.position, () => {
	if (props.show) {
		updatePosition();
	}
});

const handleClickOutside = (event: MouseEvent) => {
	const target = event.target as HTMLElement;
	
	// Проверяем, что клик был вне меню, подменю и модального окна выбора плейлиста
	const isOutsideMenu = !target.closest(".context-menu") 
		&& !target.closest(".context-submenu")
		&& !target.closest(".playlist-select-overlay");
	
	if (isOutsideMenu) {
		// Проверяем, что клик был не на элементе трека
		// Если клик был на треке, предотвращаем всплытие события, чтобы не запустить воспроизведение
		const isOnSong = target.closest(".song");
		
		if (isOnSong) {
			// Предотвращаем всплытие события, чтобы клик на треке не запустил воспроизведение
			event.stopPropagation();
		}
		
		close();
	}
};

onMounted(() => {
	document.addEventListener("click", handleClickOutside);
	document.addEventListener("contextmenu", close);
});

onUnmounted(() => {
	document.removeEventListener("click", handleClickOutside);
	document.removeEventListener("contextmenu", close);
});
</script>

<style scoped lang="scss">
.context-menu-overlay {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 3000;
}

.context-menu {
	position: fixed;
	background: var(--bg-secondary, #181818);
	border-radius: 8px;
	padding: 4px;
	min-width: 240px;
	box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
	border: 1px solid var(--border, #282828);
	z-index: 3001;
}

.context-menu-item {
	width: 100%;
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 10px 12px;
	background: none;
	border: none;
	color: var(--text, #fff);
	cursor: pointer;
	border-radius: 6px;
	transition: all 0.2s ease;
	text-align: left;
	font-size: 14px;
	position: relative;

	&:hover {
		background: var(--bg-hover, #2a2a2a);
	}

	&.context-menu-item-disabled {
		cursor: default;
		opacity: 0.5;

		&:hover {
			background: none;
		}
	}

	&.context-menu-item-with-submenu {
		.submenu-arrow {
			margin-left: auto;
			opacity: 0.6;
		}

		&:hover .submenu-arrow {
			opacity: 1;
		}
	}
}

.context-menu-divider {
	height: 1px;
	background: var(--border, #282828);
	margin: 4px 0;
}

.context-submenu {
	position: fixed;
	background: var(--bg-secondary, #181818);
	border-radius: 8px;
	padding: 4px;
	min-width: 200px;
	max-width: 300px;
	max-height: 400px;
	overflow-y: auto;
	box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
	border: 1px solid var(--border, #282828);
	z-index: 3002;
}

.context-menu-item-with-cover {
	gap: 10px;

	.playlist-submenu-cover {
		flex-shrink: 0;
		border-radius: 4px;
		overflow: hidden;
		width: 32px;
		height: 32px;
	}
}
</style>

