<template>
	<div class="sidebar">
		<div v-if="!showSearchInTitlebar" class="sidebar-search">
			<div class="search-input-wrapper">
				<Icon name="mdi:magnify" size="20" class="search-icon" />
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
					<Icon name="mdi:close" size="16" />
				</button>
			</div>
		</div>

		<nav class="sidebar-nav">
			<NuxtLink
				v-for="item in navigationItems"
				:key="item.path"
				:to="item.path"
				class="nav-item"
				:class="{ active: isActive(item.path) }"
			>
				<Icon :name="item.icon" size="24" />
				<span class="nav-item-text">{{ item.label }}</span>
			</NuxtLink>
		</nav>

		<button
			@click="openSettings"
			class="sidebar-settings-button"
		>
			<Icon name="mdi:cog" size="24" />
			<span class="sidebar-settings-text">{{ getString("navigation.settings") }}</span>
		</button>

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
					<div class="user-name">{{ userName }}</div>
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
					<div class="user-name">{{ userName }}</div>
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
	</div>
</template>

<script setup lang="ts">
import { useVkStore } from "~/stores/vk";
import { useSettingsStore } from "~/stores/settings";
import { useModal } from "~/composables/useModal";

const { getString } = useStrings();
const route = useRoute();
const vkStore = useVkStore();
const settingsStore = useSettingsStore();
const { openSettings } = useModal();

const userId = computed(() => vkStore.user_id || 0);
const searchQuery = ref("");
const showAccountMenu = ref(false);
const accounts = ref<any[]>([]);

const windowWidth = ref(typeof window !== "undefined" ? window.innerWidth : 0);

const showSearchInTitlebar = computed(() => {
	return windowWidth.value <= 600;
});

if (typeof window !== "undefined") {
	const handleResize = () => {
		windowWidth.value = window.innerWidth;
	};

	onMounted(() => {
		window.addEventListener("resize", handleResize);
	});

	onUnmounted(() => {
		window.removeEventListener("resize", handleResize);
	});
}

const navigationItems = computed(() => [
	{ path: "/general", label: getString("navigation.main"), icon: "mdi:home" },
	{ path: userId.value ? `/playlist/${userId.value}/-1` : "/auth", label: getString("navigation.myMusic"), icon: "mdi:music-box-multiple" },
	{ path: "/queue", label: "Очередь", icon: "mdi:playlist-play" }
]);

const isActive = (path: string): boolean => {
	if (path === "/general") {
		return route.path === "/general";
	}
	return route.path.startsWith(path);
};

const user = computed(() => vkStore.user);
const userName = computed(() => {
	if (!user.value) {
		return "";
	}
	return `${user.value.first_name || ""} ${user.value.last_name || ""}`.trim() || "Пользователь";
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

onMounted(async () => {
	await settingsStore.load();
	await loadAccounts();
});

const loadAccounts = async () => {
	const accountIds = settingsStore.settings.vk.accounts.map(account => account.user);

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
			accounts.value.push(...response);
		}
	}
};

const getAccountName = (account: any): string => {
	return `${account.first_name || ""} ${account.last_name || ""}`.trim() || "User";
};

const switchAccount = async (account: any) => {
	const accountIndex = settingsStore.settings.vk.accounts.findIndex(acc => acc.user === account.id);
	if (accountIndex >= 0) {
		settingsStore.updateSection("vk", { active: accountIndex });
		showAccountMenu.value = false;
		await navigateTo("/?reload=1");
	}
};
</script>

<style scoped lang="scss">
.sidebar {
	display: flex;
	flex-direction: column;
	width: 240px;
	height: 100%;
	background: var(--bg-sidebar, #1a1a1a);
	border-right: 1px solid var(--border, #2a2a2a);
	overflow-y: auto;
	overflow-x: hidden;
	transition: width 0.3s ease;

	@media (max-width: 1000px) {
		width: 200px;
	}

	@media (max-width: 800px) {
		width: 180px;
	}

	@media (max-width: 700px) {
		width: 160px;
	}

	@media (max-width: 600px) {
		width: 80px;
	}
}

.sidebar-header {
	padding: 20px;
	border-bottom: 1px solid var(--border, #2a2a2a);

	@media (max-width: 1000px) {
		padding: 16px;
	}

	@media (max-width: 800px) {
		padding: 12px;
	}

	@media (max-width: 600px) {
		padding: 12px;
		display: flex;
		justify-content: center;
	}
}

.sidebar-logo {
	font-size: 20px;
	font-weight: 700;
	color: var(--text, #fff);

	@media (max-width: 1000px) {
		font-size: 18px;
	}

	@media (max-width: 800px) {
		font-size: 16px;
	}

	@media (max-width: 600px) {
		font-size: 14px;
	}
}

.sidebar-search {
	position: relative;
	padding: 10px 20px;
	border-bottom: 1px solid var(--border, #2a2a2a);

	@media (max-width: 1000px) {
		padding: 8px 16px;
	}

	@media (max-width: 800px) {
		padding: 6px 12px;
	}

	@media (max-width: 600px) {
		display: none;
	}
}

.search-input-wrapper {
	position: relative;
	display: flex;
	align-items: center;
	background: var(--bg-tertiary, #2a2a2a);
	border-radius: 6px;
	padding: 8px 12px;
	gap: 8px;

	@media (max-width: 1000px) {
		padding: 6px 10px;
		gap: 6px;
	}

	@media (max-width: 800px) {
		padding: 5px 8px;
		gap: 5px;
	}

	@media (max-width: 600px) {
		padding: 8px;
		width: 48px;
		justify-content: center;
	}
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
	font-size: 14px;

	@media (max-width: 1000px) {
		font-size: 13px;
	}

	@media (max-width: 800px) {
		font-size: 12px;
	}

	@media (max-width: 600px) {
		display: none;
	}

	&::placeholder {
		color: var(--text-secondary, #b3b3b3);
	}
}

.search-clear {
	background: none;
	border: none;
	cursor: pointer;
	padding: 4px;
	color: var(--text-secondary, #b3b3b3);
	display: flex;
	align-items: center;
	justify-content: center;
	transition: color 0.2s;

	&:hover {
		color: var(--text, #fff);
	}
}


.sidebar-nav {
	display: flex;
	flex-direction: column;
	padding: 10px 0;
	flex: 1;

	@media (max-width: 1000px) {
		padding: 8px 0;
	}

	@media (max-width: 800px) {
		padding: 6px 0;
	}

	@media (max-width: 600px) {
		padding: 4px 0;
	}
}

.nav-item {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 12px 20px;
	color: var(--text-secondary, #b3b3b3);
	text-decoration: none;
	transition: all 0.2s;
	border-left: 2px solid transparent;
	position: relative;

	@media (max-width: 1000px) {
		padding: 10px 16px;
		gap: 10px;
	}

	@media (max-width: 800px) {
		padding: 8px 12px;
		gap: 8px;
	}

	@media (max-width: 600px) {
		padding: 10px;
		justify-content: center;
		gap: 0;
		border-left: none;
		border-top: 2px solid transparent;
	}

	&:hover {
		background: var(--hover, #2a2a2a);
		color: var(--text, #fff);
	}

	&.active {
		color: var(--secondary, #e9003f);

		&::before {
			content: "";
			position: absolute;
			left: 0;
			top: 50%;
			transform: translateY(-50%);
			width: 2px;
			height: 60%;
			background: var(--secondary, #e9003f);
			border-radius: 0 2px 2px 0;
		}

		@media (max-width: 600px) {
			&::before {
				left: 50%;
				top: 0;
				transform: translateX(-50%);
				width: 60%;
				height: 2px;
				border-radius: 0 0 2px 2px;
			}
		}
	}

	&-text {
		font-size: 14px;
		font-weight: 500;

		@media (max-width: 1000px) {
			font-size: 13px;
		}

		@media (max-width: 800px) {
			font-size: 12px;
		}

		@media (max-width: 600px) {
			display: none;
		}
	}

	@media (max-width: 600px) {
		:deep(svg) {
			width: 24px;
			height: 24px;
		}
	}
}

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

.sidebar-settings-button {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 12px 20px;
	color: var(--text-secondary, #b3b3b3);
	background: transparent;
	border: none;
	border-top: 1px solid var(--border, #2a2a2a);
	cursor: pointer;
	transition: all 0.2s;
	text-align: left;
	width: 100%;

	@media (max-width: 1000px) {
		padding: 10px 16px;
		gap: 10px;
	}

	@media (max-width: 800px) {
		padding: 8px 12px;
		gap: 8px;
	}

	@media (max-width: 600px) {
		padding: 10px;
		justify-content: center;
		gap: 0;
	}

	&:hover {
		background: var(--hover, #2a2a2a);
		color: var(--text, #fff);
	}
}

.sidebar-settings-text {
	font-size: 14px;
	font-weight: 500;

	@media (max-width: 1000px) {
		font-size: 13px;
	}

	@media (max-width: 800px) {
		font-size: 12px;
	}

	@media (max-width: 600px) {
		display: none;
	}
}

@media (max-width: 600px) {
	.sidebar-settings-button {
		:deep(svg) {
			width: 24px;
			height: 24px;
		}
	}
}
</style>

