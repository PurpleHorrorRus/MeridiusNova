<template>
	<div class="modal-settings">
		<div class="modal-settings-header">
			<h1 class="modal-settings-title">{{ getString("settings.title") }}</h1>
			<button
				class="modal-settings-close"
				@click="handleClose"
			>
				<Icon name="mdi:close" size="24" />
			</button>
		</div>

		<div class="modal-settings-content">
			<div class="modal-settings-tabs">
				<button
					v-for="tab in tabs"
					:key="tab.id"
					:class="['modal-settings-tab', { active: activeTab === tab.id }]"
					@click="activeTab = tab.id"
				>
					<Icon :name="tab.icon" size="20" />
					<span class="modal-settings-tab-label">{{ getString(tab.label) }}</span>
				</button>
			</div>

			<div class="modal-settings-tab-content">
				<component :is="currentComponent" />
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import SettingsAccounts from "~/components/Settings/Tabs/Accounts.vue";
import SettingsAppearance from "~/components/Settings/Tabs/Appearance.vue";
import SettingsDownloads from "~/components/Settings/Tabs/Downloads.vue";
import SettingsEqualizer from "~/components/Settings/Tabs/Equalizer.vue";
import SettingsGeneral from "~/components/Settings/Tabs/General.vue";
import SettingsHotkeys from "~/components/Settings/Tabs/Hotkeys.vue";
import SettingsOptimization from "~/components/Settings/Tabs/Optimization.vue";
import SettingsPlayer from "~/components/Settings/Tabs/Player.vue";
import SettingsCache from "~/components/Settings/Tabs/Cache.vue";

import { useModalStore } from "~/stores/modal";

const { getString, loadLanguage } = useStrings();
const { settings, load } = useSettings();
const modalStore = useModalStore();

const isTauri = typeof window !== "undefined" && "__TAURI__" in window;
const activeTab = ref("general");

const allTabs = [
	{ id: "general", label: "settings.tabs.general", icon: "mdi:cog" },
	{ id: "appearance", label: "settings.tabs.appearance", icon: "mdi:palette" },
	{ id: "player", label: "settings.tabs.player", icon: "mdi:music" },
	{ id: "optimization", label: "settings.tabs.optimization", icon: "mdi:speedometer" },
	{ id: "downloads", label: "settings.tabs.downloads", icon: "mdi:download" },
	{ id: "equalizer", label: "settings.tabs.equalizer", icon: "mdi:equalizer" },
	{ id: "hotkeys", label: "settings.tabs.hotkeys", icon: "mdi:keyboard" },
	{ id: "cache", label: "settings.tabs.cache", icon: "mdi:database" },
	{ id: "accounts", label: "settings.tabs.accounts", icon: "mdi:account-multiple" }
];

const tabs = computed(() => {
	return isTauri ? allTabs : allTabs.filter(tabItem => tabItem.id !== "hotkeys");
});

const components: Record<string, any> = {
	general: SettingsGeneral,
	appearance: SettingsAppearance,
	player: SettingsPlayer,
	optimization: SettingsOptimization,
	downloads: SettingsDownloads,
	equalizer: SettingsEqualizer,
	hotkeys: SettingsHotkeys,
	cache: SettingsCache,
	accounts: SettingsAccounts
};

const currentComponent = computed(() => {
	return components[activeTab.value] || SettingsGeneral;
});

const handleClose = () => {
	modalStore.close();
};

watch(() => tabs.value, (newTabs) => {
	if (!isTauri && activeTab.value === "hotkeys") {
		activeTab.value = "general";
	}
}, { immediate: true });

onMounted(async () => {
	await load();
	const lang = settings.value.general.lang;
	if (lang) {
		await loadLanguage(lang);
	}

	if (!isTauri && activeTab.value === "hotkeys") {
		activeTab.value = "general";
	}
});
</script>

<style scoped lang="scss">
.modal-settings {
	display: flex;
	flex-direction: column;
	height: 100%;
	overflow: hidden;
}

.modal-settings-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 24px 32px;
	border-bottom: 1px solid var(--border, #282828);
	flex-shrink: 0;

	@media (max-width: 768px) {
		padding: 16px 20px;
	}
}

.modal-settings-title {
	font-size: 28px;
	font-weight: 700;
	margin: 0;
	color: var(--text, #fff);

	@media (max-width: 768px) {
		font-size: 22px;
	}
}

.modal-settings-close {
	background: transparent;
	border: none;
	color: var(--text-secondary, #b3b3b3);
	cursor: pointer;
	padding: 8px;
	border-radius: 6px;
	transition: all 0.2s ease;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;

	&:hover {
		background: var(--bg-tertiary, #282828);
		color: var(--text, #fff);
	}
}

.modal-settings-content {
	flex: 1;
	display: flex;
	gap: 24px;
	overflow: hidden;
	padding: 24px 32px;

	@media (max-width: 1024px) {
		gap: 16px;
		padding: 20px 24px;
	}

	@media (max-width: 768px) {
		flex-direction: column;
		gap: 12px;
		padding: 16px 20px;
	}
}

.modal-settings-tabs {
	display: flex;
	flex-direction: column;
	gap: 4px;
	width: 240px;
	min-width: 240px;
	overflow-y: auto;
	overflow-x: hidden;
	padding-right: 8px;
	flex-shrink: 0;

	@media (max-width: 1024px) {
		width: 200px;
		min-width: 200px;
	}

	@media (max-width: 768px) {
		width: 100%;
		min-width: 100%;
		flex-direction: row;
		overflow-x: auto;
		overflow-y: hidden;
		padding-right: 0;
		padding-bottom: 8px;
		gap: 8px;
	}

	&::-webkit-scrollbar {
		width: 6px;

		@media (max-width: 768px) {
			height: 6px;
		}
	}

	&::-webkit-scrollbar-track {
		background: transparent;
	}

	&::-webkit-scrollbar-thumb {
		background: var(--border, #3a3a3a);
		border-radius: 3px;

		&:hover {
			background: var(--text-secondary, #b3b3b3);
		}
	}
}

.modal-settings-tab {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 12px 16px;
	background: transparent;
	border: none;
	border-left: 3px solid transparent;
	color: var(--text-secondary, #b3b3b3);
	cursor: pointer;
	transition: all 0.2s ease;
	font-size: 14px;
	text-align: left;
	width: 100%;
	border-radius: 4px;
	white-space: nowrap;

	@media (max-width: 1024px) {
		padding: 10px 12px;
		gap: 8px;
		font-size: 13px;
	}

	@media (max-width: 768px) {
		width: auto;
		min-width: fit-content;
		border-left: none;
		border-bottom: 3px solid transparent;
		padding: 10px 16px;
	}

	&:hover {
		color: var(--text, #fff);
		background: var(--bg-secondary, #1a1a1a);
	}

	&.active {
		color: var(--secondary, #e9003f);
		background: var(--bg-secondary, #1a1a1a);
		border-left-color: var(--secondary, #e9003f);

		@media (max-width: 768px) {
			border-left-color: transparent;
			border-bottom-color: var(--secondary, #e9003f);
		}
	}
}

.modal-settings-tab-label {
	font-weight: 500;

	@media (max-width: 480px) {
		display: none;
	}
}

.modal-settings-tab-content {
	flex: 1;
	min-width: 0;
	overflow-y: auto;
	overflow-x: hidden;
	padding-right: 8px;

	@media (max-width: 768px) {
		padding-right: 0;
	}

	&::-webkit-scrollbar {
		width: 6px;
	}

	&::-webkit-scrollbar-track {
		background: transparent;
	}

	&::-webkit-scrollbar-thumb {
		background: var(--border, #3a3a3a);
		border-radius: 3px;

		&:hover {
			background: var(--text-secondary, #b3b3b3);
		}
	}
}
</style>

