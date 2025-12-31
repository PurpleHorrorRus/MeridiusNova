<template>
	<div v-if="hasDownloads" class="downloads-container">
		<button
			class="downloads-button"
			@click="toggleMenu"
		>
			<Icon name="mdi:download" size="16" />
			<span v-if="activeCount > 0" class="downloads-badge">{{ activeCount }}</span>
		</button>

		<Transition name="fade">
			<div v-if="showMenu" class="downloads-menu">
				<div class="downloads-menu-header">
					<span class="downloads-menu-title">{{ getString("downloads.title") }}</span>
					<div class="downloads-menu-header-actions">
						<button
							v-if="queuedCount > 0"
							class="downloads-menu-clear"
							@click="clearQueue"
							:title="getString('downloads.clearQueue')"
						>
							<Icon name="mdi:delete-sweep" size="16" />
						</button>
						<button
							v-if="completedCount > 0"
							class="downloads-menu-clear"
							@click="clearCompleted"
							:title="getString('downloads.clearCompleted')"
						>
							<Icon name="mdi:check-circle-outline" size="16" />
						</button>
						<button
							v-if="allDownloads.length > 0"
							class="downloads-menu-clear"
							@click="clearAll"
							:title="getString('downloads.clearAll')"
						>
							<Icon name="mdi:delete-outline" size="16" />
						</button>
						<button class="downloads-menu-close" @click="closeMenu">
							<Icon name="mdi:close" size="16" />
						</button>
					</div>
				</div>

				<div class="downloads-menu-content">
					<DownloadItem
						v-for="download in allDownloads"
						:key="download.downloadId"
						:download="download"
					/>
				</div>
			</div>
		</Transition>
	</div>
</template>

<script setup lang="ts">
import { useDownloadsStore } from "~/stores/downloads";
import DownloadItem from "./DownloadItem.vue";

const { getString } = useStrings();
const downloadsStore = useDownloadsStore();

const showMenu = ref(false);

const allDownloads = computed(() => downloadsStore.getAllDownloads());
const activeDownloads = computed(() => downloadsStore.getActiveDownloads());
const queuedDownloads = computed(() => downloadsStore.getQueuedDownloads());
const completedDownloads = computed(() => downloadsStore.getCompletedDownloads());
const hasDownloads = computed(() => allDownloads.value.length > 0);
const activeCount = computed(() => activeDownloads.value.length);
const queuedCount = computed(() => queuedDownloads.value.length);
const completedCount = computed(() => completedDownloads.value.length);

onMounted(() => {
	downloadsStore.fetchQueue();

	if (import.meta.client) {
		document.addEventListener("click", handleClickOutside);
	}
});

onUnmounted(() => {
	downloadsStore.stopPolling();

	if (import.meta.client) {
		document.removeEventListener("click", handleClickOutside);
	}
});

const handleClickOutside = (event: MouseEvent) => {
	const target = event.target as HTMLElement;
	const container = document.querySelector(".downloads-container");
	
	if (container && !container.contains(target)) {
		closeMenu();
	}
};

const toggleMenu = () => {
	showMenu.value = !showMenu.value;
};

const closeMenu = () => {
	showMenu.value = false;
};

const clearQueue = async () => {
	downloadsStore.clearQueueLocal();

	await $fetch("/api/downloads/clear", {
		method: "POST",
		body: { type: "queue" }
	}).catch(() => {
		downloadsStore.fetchQueue();
	});

	await downloadsStore.fetchQueue();
};

const clearCompleted = async () => {
	downloadsStore.clearCompletedLocal();

	await $fetch("/api/downloads/clear", {
		method: "POST",
		body: { type: "completed" }
	}).catch(() => {
		downloadsStore.fetchQueue();
	});

	await downloadsStore.fetchQueue();
};

const clearAll = async () => {
	downloadsStore.clearAllLocal();

	await $fetch("/api/downloads/clear", {
		method: "POST",
		body: { type: "all" }
	}).catch(() => {
		downloadsStore.fetchQueue();
	});

	await downloadsStore.fetchQueue();
};
</script>

<style scoped lang="scss">
.downloads-container {
	position: relative;
}

.downloads-button {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 32px;
	height: 32px;
	background: transparent;
	border: none;
	color: var(--text, #fff);
	cursor: pointer;
	border-radius: 4px;
	transition: background 0.2s;

	&:hover {
		background: var(--hover, #2a2a2a);
	}
}

.downloads-badge {
	position: absolute;
	top: 4px;
	right: 4px;
	background: var(--secondary, #e9003f);
	color: var(--text, #fff);
	border-radius: 50%;
	width: 16px;
	height: 16px;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 10px;
	font-weight: 600;
}

.downloads-menu {
	position: absolute;
	top: calc(100% + 8px);
	right: 0;
	width: 320px;
	max-height: 500px;
	background: var(--bg-sidebar, #1a1a1a);
	border: 1px solid var(--border, #2a2a2a);
	border-radius: 8px;
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
	z-index: 1000;
	overflow: hidden;
	display: flex;
	flex-direction: column;
}

.downloads-menu-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 12px 16px;
	border-bottom: 1px solid var(--border, #2a2a2a);
}

.downloads-menu-header-actions {
	display: flex;
	align-items: center;
	gap: 4px;
}

.downloads-menu-clear {
	background: transparent;
	border: none;
	color: var(--text-secondary, #b3b3b3);
	cursor: pointer;
	padding: 4px;
	border-radius: 4px;
	transition: all 0.2s;
	display: flex;
	align-items: center;
	justify-content: center;

	&:hover {
		background: var(--hover, #2a2a2a);
		color: var(--text, #fff);
	}
}

.downloads-menu-title {
	font-size: 14px;
	font-weight: 600;
	color: var(--text, #fff);
}

.downloads-menu-close {
	background: transparent;
	border: none;
	color: var(--text-secondary, #b3b3b3);
	cursor: pointer;
	padding: 4px;
	border-radius: 4px;
	transition: all 0.2s;

	&:hover {
		background: var(--hover, #2a2a2a);
		color: var(--text, #fff);
	}
}

.downloads-menu-content {
	flex: 1;
	overflow-y: auto;
	padding: 8px;
}

.fade-enter-active,
.fade-leave-active {
	transition: opacity 0.2s, transform 0.2s;
}

.fade-enter-from,
.fade-leave-to {
	opacity: 0;
	transform: translateY(-8px);
}
</style>

