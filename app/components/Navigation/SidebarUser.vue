<template>
	<div v-if="user" class="sidebar-user-section">
		<div
			v-if="accounts.length > 1"
			@click="showAccountMenu = !showAccountMenu"
			class="sidebar-user"
		>
			<img
				v-if="user.photo_max || user.photo_200"
				:src="user.photo_max || user.photo_200"
				:alt="userName"
				class="user-avatar"
			/>
			<div v-else class="user-avatar-placeholder">
				{{ userName.charAt(0).toUpperCase() }}
			</div>
			<div class="user-info">
				<div class="user-name" v-text="userName" />
				<div v-if="user.screen_name" class="user-screen-name">@{{ user.screen_name }}</div>
			</div>
			<Icon name="mdi:chevron-down" size="20" class="user-chevron" />
		</div>
		<div
			v-else
			class="sidebar-user"
		>
			<img
				v-if="user.photo_max || user.photo_200"
				:src="user.photo_max || user.photo_200"
				:alt="userName"
				class="user-avatar"
			/>
			<div v-else class="user-avatar-placeholder">
				{{ userName.charAt(0).toUpperCase() }}
			</div>
			<div class="user-info">
				<div class="user-name" v-text="userName" />
				<div v-if="user.screen_name" class="user-screen-name">@{{ user.screen_name }}</div>
			</div>
		</div>

		<div v-if="showAccountMenu && accounts.length > 1" class="account-menu">
			<div
				v-for="account in accounts"
				:key="account.id"
				@click="switchAccount(account)"
				class="account-menu-item"
				:class="{ active: account.id === user.id }"
			>
				<img
					v-if="account.photo_100 || account.photo_max"
					:src="account.photo_100 || account.photo_max"
					:alt="getAccountName(account)"
					class="account-menu-avatar"
				/>
				<div v-else class="account-menu-avatar-placeholder">
					{{ getAccountName(account).charAt(0).toUpperCase() }}
				</div>
				<div class="account-menu-info">
					<div class="account-menu-name">{{ getAccountName(account) }}</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { useVkStore } from "~/stores/vk";
import { storeToRefs } from "pinia";
import { useSettingsStore } from "~/stores/settings";
import { getUserFullName } from "~/utils/user";

const props = defineProps<{
	accounts: any[];
}>();

const vkStore = useVkStore();
const settingsStore = useSettingsStore();
const { settings } = storeToRefs(settingsStore);

const user = computed(() => vkStore.user);
const userName = computed(() => {
	return getUserFullName(user.value, "Пользователь");
});

const showAccountMenu = ref(false);

const getAccountName = (account: any): string => {
	return getUserFullName(account, "User");
};

const switchAccount = async (account: any) => {
	const accountIndex = settings.value.vk.accounts.findIndex(accountItem => accountItem.user === account.id);
	if (accountIndex >= 0) {
		settingsStore.updateSection("vk", { active: accountIndex });
		showAccountMenu.value = false;
		await navigateTo("/?reload=1");
	}
};
</script>

<style scoped lang="scss">
.sidebar-user-section {
	position: relative;
}

.sidebar-user {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 15px 20px;
	border-top: 1px solid var(--border, #2a2a2a);
	background: var(--bg-secondary, #1a1a1a);
	text-decoration: none;
	color: inherit;
	transition: background 0.2s;
	cursor: pointer;

	@media (max-width: 1000px) {
		padding: 12px 16px;
		gap: 10px;
	}

	@media (max-width: 800px) {
		padding: 10px 12px;
		gap: 8px;
	}

	@media (max-width: 600px) {
		padding: 10px;
		justify-content: center;
		gap: 0;
	}

	&:hover {
		background: var(--hover, #2a2a2a);
	}
}

.user-chevron {
	color: var(--text-secondary, #b3b3b3);
	transition: transform 0.2s;
	margin-left: auto;

	.sidebar-user:hover & {
		color: var(--text, #fff);
	}
}

.account-menu {
	position: absolute;
	bottom: 100%;
	left: 0;
	right: 0;
	background: var(--bg-sidebar, #1a1a1a);
	border: 1px solid var(--border, #2a2a2a);
	border-radius: 8px 8px 0 0;
	max-height: 300px;
	overflow-y: auto;
	z-index: 100;

	@media (max-width: 600px) {
		bottom: 100%;
		left: 0;
		right: 0;
		max-height: 200px;
	}
}

.account-menu-item {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 12px 20px;
	cursor: pointer;
	transition: background 0.2s;

	&:hover {
		background: var(--hover, #2a2a2a);
	}

	&.active {
		background: var(--bg-tertiary, #2a2a2a);
	}
}

.account-menu-avatar,
.account-menu-avatar-placeholder {
	width: 32px;
	height: 32px;
	border-radius: 50%;
	object-fit: cover;
	flex-shrink: 0;
}

.account-menu-avatar-placeholder {
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--secondary, #e9003f);
	color: var(--text, #fff);
	font-weight: 600;
	font-size: 14px;
}

.account-menu-info {
	flex: 1;
	min-width: 0;
}

.account-menu-name {
	font-size: 13px;
	font-weight: 500;
	color: var(--text, #fff);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.user-avatar,
.user-avatar-placeholder {
	width: 40px;
	height: 40px;
	border-radius: 50%;
	object-fit: cover;
	flex-shrink: 0;

	@media (max-width: 1000px) {
		width: 36px;
		height: 36px;
	}

	@media (max-width: 800px) {
		width: 32px;
		height: 32px;
	}

	@media (max-width: 600px) {
		width: 40px;
		height: 40px;
	}
}

.user-avatar-placeholder {
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--secondary, #e9003f);
	color: var(--text, #fff);
	font-weight: 600;
	font-size: 16px;

	@media (max-width: 1000px) {
		font-size: 14px;
	}

	@media (max-width: 800px) {
		font-size: 12px;
	}

	@media (max-width: 600px) {
		font-size: 16px;
	}
}

.user-info {
	flex: 1;
	min-width: 0;

	@media (max-width: 600px) {
		display: none;
	}
}

.user-name {
	font-size: 14px;
	font-weight: 600;
	color: var(--text, #fff);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;

	@media (max-width: 1000px) {
		font-size: 13px;
	}

	@media (max-width: 800px) {
		font-size: 12px;
	}
}

.user-screen-name {
	font-size: 12px;
	color: var(--text-secondary, #b3b3b3);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;

	@media (max-width: 1000px) {
		font-size: 11px;
	}

	@media (max-width: 800px) {
		font-size: 10px;
	}
}
</style>

