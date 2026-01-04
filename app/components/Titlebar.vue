<template>
	<div id="titlebar" @mousedown="handleMouseDown">
		<div id="titlebar-left">
			<span id="titlebar-left__logo">
				Meridius
			</span>
		</div>

		<div v-if="showSearch" id="titlebar-center">
			<div class="titlebar-search" @mousedown.stop>
				<div class="search-input-wrapper">
					<Icon name="mdi:magnify" size="16" class="search-icon" />
					<input
						v-model="searchQuery"
						type="text"
						:placeholder="getString('search.placeholder')"
						class="search-input"
						@keydown.enter="handleSearchKeydown"
					/>
					<button
						v-if="searchQuery"
						@click="clearSearch"
						class="search-clear"
					>
						<Icon name="mdi:close" size="14" />
					</button>
				</div>

			</div>
		</div>

		<div id="titlebar-right">
			<Downloads />

			<div v-if="updateAvailable" class="titlebar-update-notification" @click="openSettings">
				<Icon name="mdi:download" size="16" />
				<span class="update-text">{{ getString("titlebar.update.available") }}</span>
			</div>

			<div class="titlebar-right__button" @click="handleMinimize">
				<Icon name="bx:minus" />
			</div>

			<div class="titlebar-right__button" @click="handleMaximize">
				<Icon name="bx:square" size="14" />
			</div>

			<div class="titlebar-right__button" id="close-button" @click="handleClose">
				<Icon name="bx:x" size="20" />
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import Downloads from "./Downloads/Downloads.vue";
import { useUpdater } from "~/composables/useUpdater";
import { useModal } from "~/composables/useModal";
import { useEventListener } from "~/composables/useEventListener";

const { getString } = useStrings();
const { openSettings } = useModal();
const isTauri = typeof window !== "undefined" && "__TAURI__" in window;

const appWindow = ref<any>(null);
const { updateAvailable, checkForUpdates } = useUpdater();

const searchQuery = ref("");

const windowWidth = ref(0);

const showSearch = computed(() => {
	return windowWidth.value <= 600;
});

onMounted(async () => {
	await nextTick();

	if (typeof window !== "undefined") {
		windowWidth.value = window.innerWidth;

		const handleResize = () => {
			windowWidth.value = window.innerWidth;
		};

		useEventListener(window, "resize", handleResize);
	}

	if (isTauri && import.meta.client) {
		const { getCurrentWindow } = await import("@tauri-apps/api/window");
		appWindow.value = getCurrentWindow();

		await checkForUpdates();

		const checkInterval = setInterval(async () => {
			await checkForUpdates();
		}, 10 * 60 * 1000);

		onUnmounted(() => {
			clearInterval(checkInterval);
		});
	}
});

const handleSearchKeydown = (event: KeyboardEvent) => {
	if (event.key === "Enter") {
		const query = searchQuery.value.trim();
		if (query.length > 0) {
			navigateTo(`/search?q=${encodeURIComponent(query)}`);
		}
	}
};

const clearSearch = () => {
	searchQuery.value = "";
};

const handleMouseDown = (event: MouseEvent) => {
	if (event.button !== 0 || !appWindow.value) {
		return;
	}

	const target = event.target as HTMLElement;
	const isInteractiveElement = target.closest("button, input, a, .titlebar-right__button, .titlebar-update-notification, .titlebar-search");

	if (!isInteractiveElement) {
		appWindow.value.startDragging();
	}
};

const handleMinimize = () => {
	return appWindow.value?.minimize();
};

const handleMaximize = async () => {
	if (!appWindow.value) {
		return;
	}

	return await appWindow.value.isMaximized() 
		? appWindow.value.unmaximize()
		: appWindow.value.maximize();
};

const handleClose = async () => {
	if (!appWindow.value || !isTauri || !import.meta.client) {
		return;
	}

	const { settings, load } = useSettings();
	await load();

	if (settings.value.window.hideOnClose) {
		return await appWindow.value.hide();
	}

	return await appWindow.value.close();
};
</script>

<style scoped lang="scss">
#titlebar {
	display: grid;
	grid-template-columns: auto 1fr auto;
	align-items: center;
	
	width: 100%;
	height: 100%;

	background-color: var(--titlebar);

	&-left {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: flex-start;
		height: 100%;
		flex-shrink: 0;
		grid-column: 1;
	
		&__logo {
			padding-left: 10px;
			flex-shrink: 0;

			font-size: 14px;
			font-weight: bold;
			user-select: none;

			@media (max-width: 600px) {
				font-size: 12px;
				padding-left: 8px;
			}
		}
	}

	&-center {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
		position: relative;
		grid-column: 2;
	}

	&-right {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: flex-end;
		height: 100%;
		flex-shrink: 0;
		gap: 8px;
		grid-column: 3;

		.titlebar-update-notification {
			display: flex;
			align-items: center;
			gap: 6px;
			padding: 4px 12px;
			background: var(--secondary, #e9003f);
			border-radius: 4px;
			cursor: pointer;
			transition: all 0.2s ease;
			font-size: 12px;
			font-weight: 500;
			color: var(--text, #fff);

			&:hover {
				background: var(--primary-hover, #ff1a5c);
				transform: translateY(-1px);
			}

			.update-text {
				white-space: nowrap;
			}

			@media (max-width: 600px) {
				.update-text {
					display: none;
				}
			}
		}

		.titlebar-right__button {
			display: flex;
			align-items: center;
			justify-content: center;

			width: 40px;
			height: 100%;

			cursor: pointer;

			span {
				user-select: none;
			}

			&:hover {
				background-color: var(--hover);

				&#close-button {
					background-color: #e9003f;
				}
			}
		}
	}
}

.titlebar-search {
	position: relative;
	width: 280px;

	@media (max-width: 600px) {
		width: 200px;
	}
}

.search-input-wrapper {
	position: relative;
	display: flex;
	align-items: center;
	background: var(--bg-tertiary, #2a2a2a);
	border-radius: 4px;
	padding: 4px 8px;
	gap: 6px;
}

.search-icon {
	color: var(--text-secondary, #b3b3b3);
	flex-shrink: 0;
}

.search-input {
	flex: 1;
	background: transparent;
	border: none;
	outline: none;
	color: var(--text, #fff);
	font-size: 12px;
	min-width: 0;

	&::placeholder {
		color: var(--text-secondary, #b3b3b3);
	}
}

.search-clear {
	background: none;
	border: none;
	cursor: pointer;
	padding: 2px;
	color: var(--text-secondary, #b3b3b3);
	display: flex;
	align-items: center;
	justify-content: center;
	transition: color 0.2s;

	&:hover {
		color: var(--text, #fff);
	}
}

.search-results {
	position: absolute;
	top: 100%;
	left: 0;
	right: 0;
	background: var(--bg-sidebar, #1a1a1a);
	border: 1px solid var(--border, #2a2a2a);
	border-radius: 0 0 8px 8px;
	max-height: 400px;
	overflow-y: auto;
	z-index: 1000;
	margin-top: 4px;
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.search-loading {
	padding: 20px;
	text-align: center;
	color: var(--text-secondary, #b3b3b3);
	font-size: 12px;
}

.search-results-content {
	display: flex;
	flex-direction: column;
}

.search-section {
	padding: 8px 0;
	border-bottom: 1px solid var(--border, #2a2a2a);

	&:last-child {
		border-bottom: none;
	}
}

.search-section-title {
	padding: 8px 12px;
	font-size: 11px;
	font-weight: 600;
	color: var(--text-secondary, #b3b3b3);
	text-transform: uppercase;
}

.search-result-item {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 8px 12px;
	cursor: pointer;
	text-decoration: none;
	color: var(--text, #fff);
	transition: background 0.2s;

	&:hover {
		background: var(--hover, #2a2a2a);
	}
}

.result-cover {
	width: 32px;
	height: 32px;
	border-radius: 4px;
	object-fit: cover;
	flex-shrink: 0;
}

.result-info {
	flex: 1;
	min-width: 0;
}

.result-title {
	font-size: 12px;
	font-weight: 500;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.result-subtitle {
	font-size: 11px;
	color: var(--text-secondary, #b3b3b3);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.search-more {
	padding: 10px;
	text-align: center;
	color: var(--primary, #1db954);
	text-decoration: none;
	font-weight: 600;
	font-size: 12px;
	border-top: 1px solid var(--border, #2a2a2a);
	transition: background 0.2s;

	&:hover {
		background: var(--hover, #2a2a2a);
	}
}
</style>