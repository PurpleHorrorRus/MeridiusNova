<template>
	<div class="auth-page">
		<div v-if="isTauri" class="auth-titlebar-wrapper">
			<Titlebar />
		</div>
		<div class="auth-content">
			<div class="auth-container">
				<div class="auth-header">
					<h1 class="auth-title">Авторизация</h1>
					<p class="auth-subtitle">Отсканируйте QR-код в приложении VK</p>
				</div>

				<div class="auth-qr-wrapper">
					<div v-if="pending" class="auth-loading">
						<div class="spinner"></div>
						<p>Загрузка QR-кода...</p>
					</div>
					<div v-else-if="data?.url" class="auth-qr">
						<Qrcode :value="data.url" :size="280" />
						<div v-if="isExpired" class="auth-expired">
							<p>QR-код истек</p>
							<button @click="refreshQr" class="auth-refresh-btn">Обновить</button>
						</div>
					</div>
				</div>

				<div class="auth-footer">
					<p class="auth-hint">Откройте приложение VK на телефоне и отсканируйте код</p>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import Qrcode from "qrcode.vue";

import { useVkStore } from "~/stores/vk";

import type { TQrResponse } from "~~/server/utils/types";
import type { TWebTokenResponse } from "~~/server/types/auth";

definePageMeta({
	layout: false
});

const isTauri = typeof window !== "undefined" && "__TAURI__" in window;
const vkStore = useVkStore();
const authInit = useAuthInit();

// Если пользователь уже авторизован, редиректим на главную
if (vkStore.authenticated && vkStore.user) {
	await navigateTo("/");
}

const intervalId = ref<ReturnType<typeof setInterval> | null>(null);
const expiresAt = ref<number | null>(null);
const data = ref<TQrResponse | null>(null);
const pending = ref(true);

const isExpired = computed(() => {
	if (!expiresAt.value) return false;
	return Date.now() / 1000 >= expiresAt.value;
});

const loadQr = async () => {
	pending.value = true;

	const [error, response] = await $fetch<TQrResponse>("/api/vk/qr", {
		credentials: "include"
	}).then(data => [null, data]).catch(err => [err, null]);
	
	if (error) {
		console.error("Failed to load QR code:", error);
		pending.value = false;
		return;
	}
	
	data.value = response;

	if (response?.expires_in) {
		expiresAt.value = Math.floor(Date.now() / 1000) + response.expires_in;
	}

	pending.value = false;
};

const refreshQr = async () => {
	await loadQr();
};

await loadQr();

const stopInterval = () => {
	if (intervalId.value) {
		clearInterval(intervalId.value);
		intervalId.value = null;
	}
};

const check = async () => {
	const checked = await $fetch<TWebTokenResponse["data"] | false>("/api/vk/qr-check", {
		credentials: "include"
	}).catch(() => (false));

	if (!checked) {
		return;
	}

	stopInterval();
	
	if (await authInit.initialize()) {
		await navigateTo("/");
	}
};

onBeforeMount(() => {
	watch(pending, (pending: boolean) => {
		if (!pending && data.value?.url) {
			intervalId.value = setInterval(check, 3000);
		} else {
			stopInterval();
		}
	}, { immediate: true });

	watch(isExpired, (expired) => {
		if (expired) {
			stopInterval();
		} else if (!pending.value && data.value?.url && !intervalId.value) {
			intervalId.value = setInterval(check, 3000);
		}
	});
});

onBeforeUnmount(stopInterval);
</script>

<style scoped lang="scss">
.auth-page {
	display: flex;
	flex-direction: column;
	width: 100%;
	height: 100vh;
	background: linear-gradient(135deg, #121212 0%, #1a1a1a 100%);
	overflow: hidden;
}

.auth-titlebar-wrapper {
	height: 30px;
	flex-shrink: 0;
	overflow: hidden;
}

.auth-content {
	flex: 1;
	display: flex;
	justify-content: center;
	align-items: center;
	padding: 20px;
	overflow-y: auto;
}

.auth-container {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 32px;
	max-width: 400px;
	width: 100%;
}

.auth-header {
	text-align: center;
}

.auth-title {
	font-size: 32px;
	font-weight: 700;
	margin: 0 0 8px 0;
	color: var(--text, #ffffff);
	letter-spacing: -0.5px;
}

.auth-subtitle {
	font-size: 16px;
	margin: 0;
	color: var(--text-secondary, #b3b3b3);
	font-weight: 400;
}

.auth-qr-wrapper {
	position: relative;
	width: 100%;
	display: flex;
	justify-content: center;
	align-items: center;
	min-height: 320px;
}

.auth-loading {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 16px;
	color: var(--text-secondary, #b3b3b3);

	p {
		margin: 0;
		font-size: 14px;
	}
}

.spinner {
	width: 48px;
	height: 48px;
	border: 3px solid var(--bg-tertiary, #282828);
	border-top-color: var(--primary, #e9003f);
	border-radius: 50%;
	animation: spin 0.8s linear infinite;
}

@keyframes spin {
	to {
		transform: rotate(360deg);
	}
}

.auth-qr {
	position: relative;
	padding: 20px;
	background: var(--bg-secondary, #181818);
	border-radius: 16px;
	box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.auth-expired {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
	gap: 16px;
	background: rgba(18, 18, 18, 0.95);
	border-radius: 16px;
	backdrop-filter: blur(8px);

	p {
		margin: 0;
		color: var(--text-secondary, #b3b3b3);
		font-size: 16px;
	}
}

.auth-refresh-btn {
	padding: 10px 24px;
	background: var(--primary, #e9003f);
	color: #ffffff;
	border: none;
	border-radius: 8px;
	font-size: 14px;
	font-weight: 600;
	cursor: pointer;
	transition: background 0.2s ease, transform 0.1s ease;

	&:hover {
		background: var(--primary-hover, #ff1a5c);
		transform: scale(1.05);
	}

	&:active {
		transform: scale(0.98);
	}
}

.auth-footer {
	text-align: center;
}

.auth-hint {
	margin: 0;
	font-size: 14px;
	color: var(--text-tertiary, #6b6b6b);
	line-height: 1.5;
}
</style>