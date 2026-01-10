<template>
	<div class="settings-tab-hotkeys">
		<div class="settings-section">
			<div class="section-header">
				<h2 class="section-title">{{ getString("settings.hotkeys.title") }}</h2>
				<p class="section-description">
					Нажмите на поле ввода и нажмите нужную комбинацию клавиш для назначения горячей клавиши
				</p>
			</div>

			<div class="hotkeys-categories">
				<div
					v-for="category in hotkeyCategories"
					:key="category.name"
					class="hotkey-category"
				>
					<h3 class="category-title">
						<Icon :name="category.icon" size="20" />
						{{ category.name }}
					</h3>
					<div class="category-items">
						<div
							v-for="hotkey in category.items"
							:key="hotkey.action"
							class="settings-item"
						>
							<label class="settings-label">{{ getString(hotkey.label) }}</label>
							<HotkeyInput
								:value="hotkey.accelerator"
								@change="updateHotkey(hotkey.action, $event)"
							/>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import HotkeyInput from "~/components/Settings/HotkeyInput.vue";

import { useHotkeys } from "~/composables/useHotkeys";

const { getString } = useStrings();
const settingsStore = useSettingsStore();
const { settings } = storeToRefs(settingsStore);
const { registerHotkey, unregisterHotkey, registerHotkeys, unregisterHotkeys } = useHotkeys();

onMounted(async () => {
	await unregisterHotkeys();
});

onUnmounted(async () => {
	await registerHotkeys();
});

const hotkeyCategories = computed(() => {
	const allHotkeys = [
		{ action: "playpause", label: "settings.hotkeys.playpause" },
		{ action: "playnext", label: "settings.hotkeys.playnext" },
		{ action: "playprev", label: "settings.hotkeys.playprev" },
		{ action: "volup", label: "settings.hotkeys.volup" },
		{ action: "voldown", label: "settings.hotkeys.voldown" },
		{ action: "volmute", label: "settings.hotkeys.volmute" },
		{ action: "rateup", label: "settings.hotkeys.rateup" },
		{ action: "ratedown", label: "settings.hotkeys.ratedown" },
		{ action: "nextplaylist", label: "settings.hotkeys.nextplaylist" },
		{ action: "prevplaylist", label: "settings.hotkeys.prevplaylist" }
	];

	const hotkeysWithAccelerators = allHotkeys.map(hotkey => ({
		...hotkey,
		accelerator: (settings.value.hotkeys as Record<string, string>)[hotkey.action] || ""
	}));

	return [
		{
			name: "Воспроизведение",
			icon: "mdi:play-circle",
			items: hotkeysWithAccelerators.filter(hotkey => ["playpause", "playnext", "playprev"].includes(hotkey.action))
		},
		{
			name: "Громкость",
			icon: "mdi:volume-high",
			items: hotkeysWithAccelerators.filter(hotkey => ["volup", "voldown", "volmute"].includes(hotkey.action))
		},
		{
			name: "Скорость воспроизведения",
			icon: "mdi:speedometer",
			items: hotkeysWithAccelerators.filter(hotkey => ["rateup", "ratedown"].includes(hotkey.action))
		},
		{
			name: "Плейлисты",
			icon: "mdi:playlist-music",
			items: hotkeysWithAccelerators.filter(hotkey => ["nextplaylist", "prevplaylist"].includes(hotkey.action))
		}
	];
});

const updateHotkey = async (action: string, accelerator: string) => {
	if (accelerator) {
		const currentHotkeys = { ...settings.value.hotkeys } as Record<string, string>;
		const conflictingAction = Object.entries(currentHotkeys).find(
			([key, value]) => key !== action && value === accelerator && value.length > 0
		);
		
		if (conflictingAction) {
			alert(`Эта комбинация клавиш уже используется для "${getString(`settings.hotkeys.${conflictingAction[0]}`)}"`);
			return;
		}
	}
	
	const currentHotkeys = { ...settings.value.hotkeys } as Record<string, string>;
	currentHotkeys[action] = accelerator;
	await settingsStore.updateSection("hotkeys", currentHotkeys);
};
</script>

<style scoped lang="scss">
.settings-tab-hotkeys {
	display: flex;
	flex-direction: column;
	gap: 40px;
}

.settings-section {
	display: flex;
	flex-direction: column;
	gap: 32px;
}

.section-header {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.section-title {
	font-size: 24px;
	font-weight: 700;
	margin: 0;
	color: var(--text, #fff);
	letter-spacing: -0.5px;

	@media (max-width: 768px) {
		font-size: 20px;
	}
}

.section-description {
	font-size: 14px;
	color: var(--text-secondary, #b3b3b3);
	margin: 0;
	line-height: 1.6;
}

.hotkeys-categories {
	display: flex;
	flex-direction: column;
	gap: 32px;
}

.hotkey-category {
	display: flex;
	flex-direction: column;
	gap: 16px;
}

.category-title {
	display: flex;
	align-items: center;
	gap: 10px;
	font-size: 18px;
	font-weight: 600;
	color: var(--text, #fff);
	margin: 0;
	padding-bottom: 8px;
	border-bottom: 2px solid var(--border, #282828);
}

.category-items {
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.settings-item {
	display: flex;
	align-items: center;
	gap: 20px;
	padding: 14px 18px;
	background: var(--bg-secondary, #1a1a1a);
	border: 1px solid var(--border, #282828);
	border-radius: 8px;
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	max-width: 100%;
	box-sizing: border-box;

	@media (max-width: 768px) {
		flex-wrap: wrap;
		padding: 12px 14px;
		gap: 12px;
	}
}

.settings-label {
	display: flex;
	align-items: center;
	gap: 10px;
	font-size: 14px;
	font-weight: 500;
	color: var(--text, #fff);
	flex: 1;
	line-height: 1.5;
	min-width: 200px;
	min-width: 0;

	@media (max-width: 768px) {
		min-width: 0;
		width: 100%;
	}
}
</style>
