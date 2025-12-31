<template>
	<div class="settings-page">
		<div class="settings-header">
			<h1 class="page-title">{{ getString("settings.title") }}</h1>
		</div>

		<div class="settings-content">
			<div class="settings-tabs">
				<button
					v-for="tab in tabs"
					:key="tab.id"
					:class="['settings-tab', { active: activeTab === tab.id }]"
					@click="activeTab = tab.id"
				>
					<Icon :name="tab.icon" size="20" />
					<span class="tab-label">{{ getString(tab.label) }}</span>
				</button>
			</div>

			<div class="settings-tab-content">
				<component :is="currentComponent" />
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { useSettingsStore } from "~/stores/settings";
import SettingsGeneral from "~/components/Settings/Tabs/General.vue";
import SettingsAppearance from "~/components/Settings/Tabs/Appearance.vue";
import SettingsPlayer from "~/components/Settings/Tabs/Player.vue";
import SettingsOptimization from "~/components/Settings/Tabs/Optimization.vue";
import SettingsDownloads from "~/components/Settings/Tabs/Downloads.vue";
import SettingsEqualizer from "~/components/Settings/Tabs/Equalizer.vue";
import SettingsHotkeys from "~/components/Settings/Tabs/Hotkeys.vue";
import SettingsAccounts from "~/components/Settings/Tabs/Accounts.vue";

const { getString, loadLanguage } = useStrings();
const settingsStore = useSettingsStore();

const activeTab = ref("general");

const tabs = [
	{ id: "general", label: "settings.tabs.general", icon: "mdi:cog" },
	{ id: "appearance", label: "settings.tabs.appearance", icon: "mdi:palette" },
	{ id: "player", label: "settings.tabs.player", icon: "mdi:music" },
	{ id: "optimization", label: "settings.tabs.optimization", icon: "mdi:speedometer" },
	{ id: "downloads", label: "settings.tabs.downloads", icon: "mdi:download" },
	{ id: "equalizer", label: "settings.tabs.equalizer", icon: "mdi:equalizer" },
	{ id: "hotkeys", label: "settings.tabs.hotkeys", icon: "mdi:keyboard" },
	{ id: "accounts", label: "settings.tabs.accounts", icon: "mdi:account-multiple" }
];

const components: Record<string, any> = {
	general: SettingsGeneral,
	appearance: SettingsAppearance,
	player: SettingsPlayer,
	optimization: SettingsOptimization,
	downloads: SettingsDownloads,
	equalizer: SettingsEqualizer,
	hotkeys: SettingsHotkeys,
	accounts: SettingsAccounts
};

const currentComponent = computed(() => {
	return components[activeTab.value] || SettingsGeneral;
});

onMounted(async () => {
	await settingsStore.load();
	const lang = settingsStore.settings.general.lang;
	if (lang) {
		await loadLanguage(lang);
	}
});
</script>

<style scoped lang="scss">
.settings-page {
	display: flex;
	flex-direction: column;
	min-height: 100%;
}

.settings-header {
	padding: 32px 32px 24px;

	@media (max-width: 768px) {
		padding: 20px 20px 16px;
	}
}

.page-title {
	font-size: 32px;
	font-weight: 700;
	margin: 0;
	color: var(--text, #fff);

	@media (max-width: 768px) {
		font-size: 24px;
	}
}

.settings-content {
	flex: 1;
	padding: 0 32px 32px;
	display: flex;
	gap: 24px;
	overflow: hidden;

	@media (max-width: 1024px) {
		gap: 16px;
		padding: 0 24px 24px;
	}

	@media (max-width: 768px) {
		flex-direction: column;
		gap: 12px;
		padding: 0 20px 20px;
	}
}

.settings-tabs {
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

.settings-tab {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 12px 16px;
	background: transparent;
	border: none;
	border-left: 3px solid transparent;
	color: var(--text-secondary, #b3b3b3);
	cursor: pointer;
	transition: all 0.2s;
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

.tab-label {
	font-weight: 500;

	@media (max-width: 480px) {
		display: none;
	}
}

.settings-tab-content {
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

.settings-tip {
	display: block;
	width: 85%;
	margin: 5px 0 0 0;
	padding: 8px 12px;
	font-size: 12px;
	color: var(--small-text, #999);
	line-height: 1.4;
	background: var(--bg-tertiary, #2a2a2a);
	border-radius: 4px;

	@media (max-width: 768px) {
		width: 100%;
	}
}
</style>
