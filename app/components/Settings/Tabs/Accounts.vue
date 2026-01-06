<template>
	<div class="settings-tab-accounts">
		<div class="settings-section">
			<h2 class="section-title">{{ getString("settings.accounts.title") }}</h2>
			<div class="settings-items">
				<div class="settings-item">
					<button @click="openLogin" class="settings-button">
						{{ getString("settings.accounts.add") }}
					</button>
				</div>

				<div v-if="profiles.length > 0" class="accounts-list">
					<div
						v-for="(profile, index) in profiles"
						:key="profile.id"
						class="account-item"
						:class="{ active: isActive(profile.id) }"
					>
						<img
							v-if="profile.photo_100 || profile.photo_max"
							:src="profile.photo_100 || profile.photo_max"
							:alt="getUserName(profile)"
							class="account-avatar"
						/>
						<div v-else class="account-avatar-placeholder">
							{{ getUserName(profile).charAt(0).toUpperCase() }}
						</div>
						<div class="account-info">
							<div class="account-name">{{ getUserName(profile) }}</div>
							<div v-if="profile.screen_name" class="account-screen-name">@{{ profile.screen_name }}</div>
						</div>
						<div class="account-actions">
							<button
								v-if="!isActive(profile.id)"
								@click="switchAccount(index)"
								class="account-button"
							>
								{{ getString("settings.accounts.switch") }}
							</button>
							<button
								v-if="!isActive(profile.id)"
								@click="removeAccount(index)"
								class="account-button danger"
							>
								{{ getString("settings.accounts.remove") }}
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { useVkStore } from "~/stores/vk";

const { getString } = useStrings();
const settingsStore = useSettingsStore();
const { settings } = storeToRefs(settingsStore);
const vkStore = useVkStore();
const profiles = ref<any[]>([]);

onMounted(async () => {
	await loadProfiles();
});

const loadProfiles = async () => {
	const accountIds = settings.value.vk.accounts.map(account => account.user);

	if (vkStore.user_id && !accountIds.includes(vkStore.user_id)) {
		accountIds.push(vkStore.user_id);
	}

	if (accountIds.length === 0) {
		return;
	}

	const chunks = [];
	for (let i = 0; i < accountIds.length; i += 100) {
		chunks.push(accountIds.slice(i, i + 100));
	}

	for (const chunk of chunks) {
		const response = await $fetch("/api/vk/users", {
			params: {
				user_ids: chunk.join(","),
				fields: "photo_100"
			}
		}).catch(() => null);

		if (response && Array.isArray(response)) {
			profiles.value.push(...response);
		}
	}

	if (vkStore.user && !profiles.value.some(profileItem => profileItem.id === vkStore.user_id)) {
		profiles.value.unshift({
			id: vkStore.user.id,
			first_name: vkStore.user.first_name,
			last_name: vkStore.user.last_name,
			photo_100: vkStore.user.photo_200 || vkStore.user.photo_max,
			photo_max: vkStore.user.photo_max || vkStore.user.photo_200,
			screen_name: vkStore.user.screen_name
		});
	}
};

const getUserName = (profile: any): string => {
	return `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Пользователь";
};

const isActive = (userId: number): boolean => {
	return vkStore.user_id === userId;
};

const switchAccount = async (index: number) => {
	const profile = profiles.value[index];
	if (!profile) {
		return;
	}

	const accountIndex = settings.value.vk.accounts.findIndex(accountItem => accountItem.user === profile.id);
	
	if (accountIndex >= 0) {
		settingsStore.updateSection("vk", { active: accountIndex });
		window.location.href = "/?reload=1";
	} else if (profile.id === vkStore.user_id) {
		window.location.href = "/?reload=1";
	}
};

const removeAccount = (index: number) => {
	const profile = profiles.value[index];
	if (!profile || isActive(profile.id)) {
		return;
	}

	const accountIndex = settings.value.vk.accounts.findIndex(accountItem => accountItem.user === profile.id);
	
	if (accountIndex >= 0) {
		const currentAccountIndex = settings.value.vk.accounts.findIndex(account => 
			account.user === vkStore.user_id
		);

		if (accountIndex < currentAccountIndex) {
			settingsStore.updateSection("vk", { active: currentAccountIndex - 1 });
		}

		const newAccounts = [...settings.value.vk.accounts];
		newAccounts.splice(accountIndex, 1);
		settingsStore.updateSection("vk", { accounts: newAccounts });
	}

	profiles.value.splice(index, 1);
};

const openLogin = () => {
	navigateTo("/login");
};
</script>

<style scoped lang="scss">
.settings-tab-accounts {
	display: flex;
	flex-direction: column;
	gap: 40px;
}

.settings-section {
	display: flex;
	flex-direction: column;
	gap: 20px;
}

.section-title {
	font-size: 22px;
	font-weight: 600;
	margin: 0;
	color: var(--text, #fff);
	letter-spacing: -0.3px;

	@media (max-width: 768px) {
		font-size: 18px;
	}
}

.settings-items {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.settings-item {
	display: flex;
	align-items: center;
	gap: 16px;
	padding: 16px;
	background: var(--bg-secondary, #1a1a1a);
	border: 1px solid var(--border, #282828);
	border-radius: 10px;
	transition: all 0.2s ease;
	box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	max-width: 100%;
	box-sizing: border-box;

	@media (max-width: 768px) {
		flex-wrap: wrap;
		padding: 14px;
		gap: 12px;
	}

	&:hover {
		background: var(--bg-tertiary, #282828);
		border-color: var(--border-secondary, #2a2a2a);
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
	}
}

.settings-button {
	padding: 10px 20px;
	background: var(--secondary, #e9003f);
	border: none;
	border-radius: 6px;
	color: var(--text, #fff);
	font-size: 14px;
	font-weight: 500;
	cursor: pointer;
	transition: all 0.2s ease;
	white-space: nowrap;

	&:hover {
		background: var(--primary-hover, #ff1a5c);
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(233, 0, 63, 0.3);
	}

	&:active {
		transform: translateY(0);
	}
}

.accounts-list {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.account-item {
	display: flex;
	align-items: center;
	gap: 16px;
	padding: 16px;
	background: var(--bg-secondary, #1a1a1a);
	border: 1px solid var(--border, #282828);
	border-radius: 10px;
	transition: all 0.2s ease;
	box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

	&:hover {
		background: var(--bg-tertiary, #282828);
		border-color: var(--border-secondary, #2a2a2a);
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
	}

	&.active {
		border-color: var(--secondary, #e9003f);
		box-shadow: 0 4px 12px rgba(233, 0, 63, 0.2);
	}
}

.account-avatar,
.account-avatar-placeholder {
	width: 48px;
	height: 48px;
	border-radius: 50%;
	object-fit: cover;
	flex-shrink: 0;
}

.account-avatar-placeholder {
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--secondary, #e9003f);
	color: var(--text, #fff);
	font-weight: 600;
	font-size: 18px;
}

.account-info {
	flex: 1;
	min-width: 0;
}

.account-name {
	font-size: 15px;
	font-weight: 600;
	color: var(--text, #fff);
}

.account-screen-name {
	font-size: 13px;
	color: var(--text-secondary, #b3b3b3);
}

.account-actions {
	display: flex;
	gap: 10px;
}

.account-button {
	padding: 8px 16px;
	background: var(--bg-tertiary, #2a2a2a);
	border: none;
	border-radius: 6px;
	color: var(--text, #fff);
	font-size: 13px;
	font-weight: 500;
	cursor: pointer;
	transition: all 0.2s ease;

	&:hover {
		background: var(--bg-hover, #2a2a2a);
		transform: translateY(-1px);
	}

	&:active {
		transform: translateY(0);
	}

	&.danger {
		background: var(--secondary, #e9003f);

		&:hover {
			background: var(--primary-hover, #ff1a5c);
			box-shadow: 0 4px 12px rgba(233, 0, 63, 0.3);
		}
	}
}
</style>
