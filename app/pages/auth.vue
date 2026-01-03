<template>
	<div class="auth-page">
		<div v-if="isTauri" class="auth-titlebar-wrapper">
			<Titlebar />
		</div>
		<div class="auth-content">
			<div class="auth-container">
				<div class="auth-header">
					<h1 class="auth-title">Авторизация</h1>
					<p class="auth-subtitle">
						{{ isMobile ? "Нажмите кнопку для авторизации через VK" : "Отсканируйте QR-код в приложении VK" }}
					</p>
				</div>

				<div class="auth-qr-wrapper">
					<div v-if="pending" class="auth-loading">
						<div class="spinner"></div>
						<p>{{ isMobile ? "Загрузка..." : "Загрузка QR-кода..." }}</p>
					</div>
					<div v-else-if="data?.url">
						<div v-if="isMobile" class="auth-button-wrapper">
							<button 
								v-if="!isExpired"
								@click="handleVkAuth"
								class="auth-vk-button"
							>
								Авторизоваться через VK
							</button>
							<div v-else class="auth-expired">
								<p>Ссылка истекла</p>
								<button @click="refreshQr" class="auth-refresh-btn">Обновить</button>
							</div>
						</div>
						<div v-else class="auth-qr">
							<Qrcode :value="data.url" :size="280" />
							<div v-if="isExpired" class="auth-expired">
								<p>QR-код истек</p>
								<button @click="refreshQr" class="auth-refresh-btn">Обновить</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import Qrcode from "qrcode.vue";

import { useVkStore } from "~/stores/vk";
import { useIsMobile } from "~/composables/useIsMobile";

import type { TQrResponse } from "~~/server/utils/types";
import type { TWebTokenResponse } from "~~/server/types/auth";

definePageMeta({
	layout: false
});

const isTauri = typeof window !== "undefined" && "__TAURI__" in window;
const vkStore = useVkStore();
const authInit = useAuthInit();
const { isMobile } = useIsMobile();

// Если пользователь уже авторизован, редиректим на сохраненный путь или главную
if (vkStore.authenticated && vkStore.user) {
	const savedRedirect = typeof window !== "undefined" ? sessionStorage.getItem("authRedirect") : null;
	if (savedRedirect) {
		sessionStorage.removeItem("authRedirect");
		await navigateTo(savedRedirect);
	} else {
		await navigateTo("/general");
	}
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

	const [error, response] = await $fetch<TQrResponse>(`/api/vk/qr?_t=${Date.now()}`, {
		credentials: "include",
		headers: {
			"Cache-Control": "no-cache"
		}
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

const handleVkAuth = () => {
	if (data.value?.url) {
		window.open(data.value.url, "_blank");
		
		if (isMobile.value) {
			setTimeout(() => {
				check();
			}, 2000);
		}
	}
};

const handleVisibilityChange = () => {
	if (document.visibilityState === "visible" && !pending.value && data.value?.url && !isExpired.value) {
		check();
	}
};

const handleFocus = () => {
	if (!pending.value && data.value?.url && !isExpired.value) {
		check();
	}
};

await loadQr();

const stopInterval = () => {
	if (intervalId.value) {
		clearInterval(intervalId.value);
		intervalId.value = null;
	}
};

const getRedirectPath = (): string => {
	if (typeof window === "undefined") {
		return "/general";
	}

	const savedRedirect = sessionStorage.getItem("authRedirect");
	if (savedRedirect) {
		sessionStorage.removeItem("authRedirect");
		return savedRedirect;
	}

	return "/general";
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
		await navigateTo(getRedirectPath());
	}
};

onMounted(() => {
	if (typeof window !== "undefined") {
		document.addEventListener("visibilitychange", handleVisibilityChange);
		window.addEventListener("focus", handleFocus);
	}

	watch(pending, (pending: boolean) => {
		if (!pending && data.value?.url) {
			const checkInterval = isMobile.value ? 1500 : 3000;
			intervalId.value = setInterval(check, checkInterval);
		} else {
			stopInterval();
		}
	}, { immediate: true });

	watch(isExpired, (expired) => {
		if (expired) {
			stopInterval();
		} else if (!pending.value && data.value?.url && !intervalId.value) {
			const checkInterval = isMobile.value ? 1500 : 3000;
			intervalId.value = setInterval(check, checkInterval);
		}
	});
});

onBeforeUnmount(() => {
	stopInterval();
	
	if (typeof window !== "undefined") {
		document.removeEventListener("visibilitychange", handleVisibilityChange);
		window.removeEventListener("focus", handleFocus);
	}
});
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

.auth-button-wrapper {
	width: 100%;
	display: flex;
	justify-content: center;
	align-items: center;
	min-height: 320px;
}

.auth-vk-button {
	padding: 16px 32px;
	background: var(--primary, #e9003f);
	color: #ffffff;
	border: none;
	border-radius: 12px;
	font-size: 16px;
	font-weight: 600;
	cursor: pointer;
	transition: background 0.2s ease, transform 0.1s ease;
	box-shadow: 0 4px 16px rgba(233, 0, 63, 0.3);

	&:hover {
		background: var(--primary-hover, #ff1a5c);
		transform: scale(1.05);
	}

	&:active {
		transform: scale(0.98);
	}
}
</style>