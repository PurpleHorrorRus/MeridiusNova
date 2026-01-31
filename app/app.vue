<template>
	<NuxtLayout>
		<div v-if="!authChecked" class="app-loading">
			<LoadingSpinner />
		</div>
		<NuxtPage v-else :transition="{
			name: 'page',
			mode: 'out-in'
		}" />
	</NuxtLayout>
</template>

<script setup lang="ts">
import { useAuthInit } from "~/composables/useAuthInit";
import { isTauri } from "~/utils/tauri";

const authInit = useAuthInit();
const route = useRoute();
const authChecked = ref(false);

const getRedirectPath = (): string | null => {
	if (typeof window === "undefined") {
		return null;
	}

	const savedRedirect = sessionStorage.getItem("authRedirect");
	if (savedRedirect) {
		sessionStorage.removeItem("authRedirect");
		return savedRedirect;
	}

	return null;
};

let trayDestroy: (() => Promise<void>) | null = null;

onMounted(async () => {
	if (await authInit.initialize()) {
		const savedRedirect = getRedirectPath();

		if (savedRedirect) {
			if (route.fullPath !== savedRedirect) {
				await navigateTo(savedRedirect);
			}
		} else if (route.path === "/" || route.path === "/auth") {
			await navigateTo("/general");
		}

		if (isTauri() && typeof window !== "undefined") {
			const { useTray } = await import("~/composables/useTray");
			const tray = useTray();
			
			await tray.createTray();
			await tray.loadPlaylists();
			trayDestroy = tray.destroyTray;
		}
	} else {
		if (!["/", "/auth"].includes(route.path)) {
			sessionStorage.setItem("authRedirect", route.fullPath);
		}

		await navigateTo("/auth");
	}

	authChecked.value = true;
});

onUnmounted(async () => {
	if (trayDestroy) {
		await trayDestroy();
		trayDestroy = null;
	}
});

watch(() => authInit.loggedIn, (loggedIn) => {
	if (!loggedIn && route.path !== "/auth") {
		sessionStorage.setItem("authRedirect", route.fullPath);
		navigateTo("/auth");
	}
});
</script>

<style lang="scss">
:root {
	--bg-primary: #121212;
	--bg-secondary: #181818;
	--bg-sidebar: #1a1a1a;
	--bg-player: #181818;
	--bg-tertiary: #282828;
	--bg-hover: #2a2a2a;
	--bg-active: #2a2a2a;

	--text: #ffffff;
	--text-secondary: #b3b3b3;
	--text-tertiary: #6b6b6b;

	--primary: #e9003f;
	--primary-hover: #ff1a5c;

	--border: #282828;
	--border-secondary: #2a2a2a;

	--scroll: #404040;
	--scroll-hover: #505050;

	--hover: rgba(255, 255, 255, 0.1);
	--active: rgba(255, 255, 255, 0.15);
}

* {
	box-sizing: border-box;
}

html, body, #__nuxt, .layout {
	width: 100%;
	height: 100%;

	margin: 0;
	padding: 0;

	overflow: hidden;
	font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
	-webkit-font-smoothing: antialiased;
	-moz-osx-font-smoothing: grayscale;
}

body {
	background: var(--bg-primary);
	color: var(--text);
}

/* Global scrollbar styles */
* {
	scrollbar-width: thin;
	scrollbar-color: var(--scroll, #404040) transparent;
}

*::-webkit-scrollbar {
	width: 8px;
	height: 8px;
}

*::-webkit-scrollbar-track {
	background: transparent;
}

*::-webkit-scrollbar-thumb {
	background: var(--scroll, #404040);
	border-radius: 4px;
	transition: background 0.2s ease;
}

*::-webkit-scrollbar-thumb:hover {
	background: var(--scroll-hover, #505050);
}

/* Page transitions */
.page-enter-active,
.page-leave-active {
	transition: opacity 0.2s ease;
}

.page-enter-from {
	opacity: 0;
}

.page-leave-to {
	opacity: 0;
}

.app-loading {
	position: fixed;
	inset: 0;
	z-index: 9999;
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--bg-primary, #121212);
}
</style>
